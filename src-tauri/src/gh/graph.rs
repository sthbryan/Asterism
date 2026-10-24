use serde_json::Value;

use super::catalog::{platforms_from_releases, refresh_tracked_rest, release_downloads};
use super::{as_bool, as_string, as_u64, map_limited, run_gh_json_lenient};
use crate::models::{PlatformDownloads, TrackedRepo};

/// Release trees are the expensive part of a refresh and GitHub resolves a
/// batch serially, so small batches run side by side beat one large request:
/// 18 repositories take ~1.7s in three parallel batches of six against ~3.4s
/// in a single batch, without raising the number of concurrent `gh` processes.
const REPOS_PER_REQUEST: usize = 6;
const RELEASES_PER_REPO: usize = 100;
const ASSETS_PER_RELEASE: usize = 100;
const WORKERS: usize = 3;

fn repo_fragment(alias: &str, full_name: &str) -> Option<String> {
    let (owner, name) = full_name.split_once('/')?;
    if owner.is_empty() || name.is_empty() || name.contains('/') {
        return None;
    }
    let owner = serde_json::to_string(owner).ok()?;
    let name = serde_json::to_string(name).ok()?;
    Some(format!(
        "{alias}: repository(owner: {owner}, name: {name}) {{ \
         nameWithOwner stargazerCount forkCount description isPrivate pushedAt \
         primaryLanguage {{ name }} \
         releases(first: {RELEASES_PER_REPO}) {{ \
           pageInfo {{ hasNextPage }} \
           nodes {{ tagName publishedAt isDraft isPrerelease \
             releaseAssets(first: {ASSETS_PER_RELEASE}) {{ \
               pageInfo {{ hasNextPage }} \
               nodes {{ name downloadCount }} \
             }} \
           }} \
         }} \
        }}"
    ))
}

pub(crate) fn batch_query(names: &[String]) -> String {
    let fragments: Vec<String> = names
        .iter()
        .enumerate()
        .filter_map(|(index, name)| repo_fragment(&format!("r{index}"), name))
        .collect();
    format!("query {{\n{}\n}}", fragments.join("\n"))
}

fn next_page(value: &Value) -> bool {
    value
        .get("pageInfo")
        .and_then(|page| page.get("hasNextPage"))
        .and_then(Value::as_bool)
        .unwrap_or(false)
}

fn failed(full_name: &str, error: String) -> TrackedRepo {
    TrackedRepo {
        fetched_at: None,
        full_name: full_name.to_string(),
        description: None,
        private: false,
        language: None,
        stars: 0,
        forks: 0,
        downloads: 0,
        platforms: PlatformDownloads::default(),
        stars_delta: None,
        forks_delta: None,
        downloads_delta: None,
        error: Some(error),
    }
}

/// Releases and assets beyond the first page make the totals a lower bound,
/// so the caller refetches those repositories over REST.
fn parse_repo(full_name: &str, value: &Value) -> (TrackedRepo, bool) {
    let Some(releases) = value.get("releases").filter(|v| v.is_object()) else {
        return (
            failed(full_name, "Could not read release downloads.".to_string()),
            false,
        );
    };
    let mut downloads = 0u64;
    let mut platforms = PlatformDownloads::default();
    let mut truncated = next_page(releases);
    let nodes = releases
        .get("nodes")
        .and_then(Value::as_array)
        .map(Vec::as_slice)
        .unwrap_or_default();
    for release in nodes {
        let Some(assets) = release.get("releaseAssets").filter(|v| v.is_object()) else {
            continue;
        };
        truncated |= next_page(assets);
        for asset in assets
            .get("nodes")
            .and_then(Value::as_array)
            .map(Vec::as_slice)
            .unwrap_or_default()
        {
            let count = as_u64(asset, "downloadCount");
            downloads = downloads.saturating_add(count);
            platforms.add(&as_string(asset, "name").unwrap_or_default(), count);
        }
    }
    let language = value
        .get("primaryLanguage")
        .and_then(|language| as_string(language, "name"));
    (
        TrackedRepo {
            fetched_at: None,
            full_name: as_string(value, "nameWithOwner").unwrap_or_else(|| full_name.to_string()),
            description: as_string(value, "description"),
            private: as_bool(value, "isPrivate"),
            language,
            stars: as_u64(value, "stargazerCount"),
            forks: as_u64(value, "forkCount"),
            downloads,
            platforms,
            stars_delta: None,
            forks_delta: None,
            downloads_delta: None,
            error: None,
        },
        truncated,
    )
}

fn alias_error(json: &Value, alias: &str) -> Option<String> {
    json.get("errors")?
        .as_array()?
        .iter()
        .find(|error| {
            error
                .get("path")
                .and_then(Value::as_array)
                .and_then(|path| path.first())
                .and_then(Value::as_str)
                == Some(alias)
        })
        .and_then(|error| as_string(error, "message"))
}

pub(crate) fn parse_batch(names: &[String], json: &Value) -> Vec<(TrackedRepo, bool)> {
    let data = json.get("data");
    names
        .iter()
        .enumerate()
        .map(|(index, full_name)| {
            let alias = format!("r{index}");
            match data
                .and_then(|data| data.get(&alias))
                .filter(|v| !v.is_null())
            {
                Some(repo) => parse_repo(full_name, repo),
                None => (
                    failed(
                        full_name,
                        alias_error(json, &alias).unwrap_or_else(|| {
                            "GitHub did not return that repository.".to_string()
                        }),
                    ),
                    false,
                ),
            }
        })
        .collect()
}

fn refresh_chunk(names: &[String]) -> Result<Vec<TrackedRepo>, String> {
    let query = batch_query(names);
    if query.trim() == "query {\n\n}" {
        return Ok(names
            .iter()
            .map(|name| failed(name, "Invalid repository name.".to_string()))
            .collect());
    }
    let json = run_gh_json_lenient(&["api", "graphql", "-f", &format!("query={query}")])?;
    let rows = parse_batch(names, &json);
    if !rows.is_empty() && rows.iter().all(|(repo, _)| repo.error.is_some()) {
        return Err(rows[0]
            .0
            .error
            .clone()
            .unwrap_or_else(|| "GitHub returned no repositories.".to_string()));
    }
    let mut repos = Vec::with_capacity(rows.len());
    let mut truncated = Vec::new();
    for (index, (repo, needs_refetch)) in rows.into_iter().enumerate() {
        if needs_refetch {
            truncated.push((index, names[index].clone()));
        }
        repos.push(repo);
    }
    if truncated.is_empty() {
        return Ok(repos);
    }
    for (index, result) in map_limited(truncated, WORKERS, |(index, name)| {
        (index, release_downloads(&name))
    }) {
        match result {
            Ok((releases, downloads)) => {
                repos[index].downloads = downloads;
                repos[index].platforms = platforms_from_releases(&releases);
                repos[index].error = None;
            }
            Err(err) => repos[index].error = Some(err),
        }
    }
    Ok(repos)
}

/// One GraphQL request per chunk replaces two `gh` launches per repository.
pub fn refresh_tracked(full_names: Vec<String>) -> Vec<TrackedRepo> {
    if full_names.is_empty() {
        return Vec::new();
    }
    let chunks: Vec<Vec<String>> = full_names
        .chunks(REPOS_PER_REQUEST)
        .map(<[String]>::to_vec)
        .collect();
    let results = map_limited(chunks, WORKERS, |chunk| {
        let result = refresh_chunk(&chunk);
        (chunk, result)
    });
    let mut repos = Vec::with_capacity(full_names.len());
    for (chunk, result) in results {
        match result {
            Ok(rows) => repos.extend(rows),
            Err(_) => repos.extend(refresh_tracked_rest(chunk)),
        }
    }
    repos
}

#[cfg(test)]
mod tests {
    use super::{batch_query, parse_batch};
    use serde_json::json;

    fn names() -> Vec<String> {
        vec!["one/alpha".into(), "two/beta".into()]
    }

    #[test]
    fn query_asks_once_per_repository() {
        let query = batch_query(&names());
        assert!(query.contains("r0: repository(owner: \"one\", name: \"alpha\")"));
        assert!(query.contains("r1: repository(owner: \"two\", name: \"beta\")"));
        assert!(query.contains("releaseAssets(first: 100)"));
    }

    #[test]
    fn invalid_names_are_skipped_instead_of_producing_broken_graphql() {
        let query = batch_query(&["no-slash".into(), "a/b/c".into()]);
        assert!(!query.contains("repository"));
    }

    #[test]
    fn batch_parses_metadata_release_downloads_and_platforms() {
        let json = json!({
            "data": {
                "r0": {
                    "nameWithOwner": "one/alpha",
                    "stargazerCount": 12,
                    "forkCount": 3,
                    "description": "Alpha",
                    "isPrivate": false,
                    "primaryLanguage": { "name": "Rust" },
                    "releases": {
                        "pageInfo": { "hasNextPage": false },
                        "nodes": [
                            { "tagName": "v1",
                              "releaseAssets": {
                                "pageInfo": { "hasNextPage": false },
                                "nodes": [
                                    { "name": "app-macos.dmg", "downloadCount": 5 },
                                    { "name": "app-setup.exe", "downloadCount": 4 }
                                ]
                              }
                            }
                        ]
                    }
                },
                "r1": null
            },
            "errors": [{ "path": ["r1"], "message": "Could not resolve to a Repository." }]
        });
        let rows = parse_batch(&names(), &json);
        assert_eq!(rows.len(), 2);
        let (first, truncated) = &rows[0];
        assert!(!truncated);
        assert_eq!(first.full_name, "one/alpha");
        assert_eq!(first.stars, 12);
        assert_eq!(first.forks, 3);
        assert_eq!(first.downloads, 9);
        assert_eq!(first.platforms.macos, 5);
        assert_eq!(first.platforms.windows, 4);
        assert_eq!(first.language.as_deref(), Some("Rust"));
        assert_eq!(first.error, None);
        let (second, _) = &rows[1];
        assert_eq!(second.full_name, "two/beta");
        assert_eq!(
            second.error.as_deref(),
            Some("Could not resolve to a Repository.")
        );
    }

    #[test]
    fn truncated_release_pages_are_flagged_for_an_exact_refetch() {
        let json = json!({
            "data": {
                "r0": {
                    "nameWithOwner": "one/alpha",
                    "releases": {
                        "pageInfo": { "hasNextPage": true },
                        "nodes": []
                    }
                },
                "r1": {
                    "nameWithOwner": "two/beta",
                    "releases": {
                        "pageInfo": { "hasNextPage": false },
                        "nodes": [
                            { "releaseAssets": {
                                "pageInfo": { "hasNextPage": true },
                                "nodes": [{ "name": "a.zip", "downloadCount": 1 }]
                            }}
                        ]
                    }
                }
            }
        });
        let rows = parse_batch(&names(), &json);
        assert!(rows[0].1 && rows[1].1);
    }
}
