use std::collections::BTreeMap;

use serde_json::Value;

use super::parse::parse_summary;
use super::{PullPage, MAX_LIST_LIMIT};
use crate::gh::{map_limited, run_gh_json_lenient};

const CHECK_CONTEXTS: usize = 20;
const PEOPLE: usize = 10;
/// GitHub resolves the aliases of one document serially, so three small
/// documents in flight finish a refresh in ~0.9s against ~1.4s for a single
/// document holding every repository.
const REPOS_PER_REQUEST: usize = 6;
const WORKERS: usize = 3;

const FIELDS: &str = "number title author{login} headRefName baseRefName isDraft state \
createdAt updatedAt mergedAt url additions deletions changedFiles reviewDecision \
statusCheckRollup{contexts(first:{contexts}){nodes{... on CheckRun{conclusion status} \
... on StatusContext{state}}}} assignees(first:{people}){nodes{login}} \
reviewRequests(first:{people}){nodes{requestedReviewer{... on User{login}}}}";

fn quote(value: &str) -> Option<String> {
    serde_json::to_string(value).ok()
}

fn state_enum(state: Option<&str>) -> Option<&'static str> {
    match state.unwrap_or("all").to_ascii_lowercase().as_str() {
        "open" => Some("OPEN"),
        "closed" => Some("CLOSED"),
        "merged" => Some("MERGED"),
        _ => None,
    }
}

fn fragment(
    index: usize,
    repo: &str,
    limit: u8,
    state: Option<&str>,
    after: Option<&str>,
) -> Option<String> {
    let (owner, name) = repo.split_once('/')?;
    let (owner, name) = (quote(owner)?, quote(name)?);
    let state = state_enum(state).map(|value| format!("states: {value}, "));
    let after = match after {
        Some(cursor) => format!("after: {}, ", quote(cursor)?),
        None => String::new(),
    };
    Some(format!(
        "r{index}: repository(owner: {owner}, name: {name}) {{ \
         pullRequests({}{after}first: {limit}, \
         orderBy: {{field: UPDATED_AT, direction: DESC}}) {{ \
         pageInfo {{hasNextPage endCursor}} nodes {{...PR}} }} }}",
        state.unwrap_or_default()
    ))
}

/// One document with an aliased connection per repository, so a refresh costs
/// a single `gh` launch instead of one per repository. `cursors` continues a
/// repository where its previous page stopped; repositories without one start
/// from the newest pull request.
pub(crate) fn list_query(
    repos: &[String],
    limit: u8,
    state: Option<&str>,
    cursors: &BTreeMap<String, String>,
) -> String {
    let limit = limit.clamp(1, MAX_LIST_LIMIT);
    let fragments: Vec<String> = repos
        .iter()
        .enumerate()
        .filter_map(|(index, repo)| {
            fragment(
                index,
                repo,
                limit,
                state,
                cursors.get(repo).map(String::as_str),
            )
        })
        .collect();
    let fields = FIELDS
        .replace("{contexts}", &CHECK_CONTEXTS.to_string())
        .replace("{people}", &PEOPLE.to_string());
    format!(
        "query {{\n{}\n}}\n\nfragment PR on PullRequest {{{fields}}}",
        fragments.join("\n")
    )
}

fn nodes(value: &Value, path: &[&str]) -> Option<Value> {
    let mut current = value;
    for key in path {
        current = current.get(key)?;
    }
    current.as_array().cloned().map(Value::Array)
}

/// Flattens the connection shapes to the ones `parse_summary` already reads.
fn normalize(node: &Value) -> Option<Value> {
    let mut object = match node {
        Value::Object(map) => map.clone(),
        _ => return None,
    };
    object.insert(
        "statusCheckRollup".into(),
        nodes(node, &["statusCheckRollup", "contexts", "nodes"])
            .unwrap_or_else(|| Value::Array(Vec::new())),
    );
    for key in ["assignees", "reviewRequests"] {
        if let Some(items) = nodes(node, &[key, "nodes"]) {
            object.insert(key.into(), items);
        }
    }
    Some(Value::Object(object))
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
        .and_then(|error| error.get("message"))
        .and_then(Value::as_str)
        .map(str::trim)
        .filter(|message| !message.is_empty())
        .map(str::to_string)
}

fn next_cursor(connection: &Value) -> Option<String> {
    let page = connection.get("pageInfo")?;
    if !page.get("hasNextPage").and_then(Value::as_bool)? {
        return None;
    }
    page.get("endCursor")
        .and_then(Value::as_str)
        .map(str::to_string)
}

pub(crate) fn parse_list(repos: &[String], json: &Value) -> Vec<PullPage> {
    let data = json.get("data");
    repos
        .iter()
        .enumerate()
        .map(|(index, repo)| {
            let alias = format!("r{index}");
            let connection = data
                .and_then(|data| data.get(&alias))
                .and_then(|repository| repository.get("pullRequests"))
                .filter(|value| value.is_object());
            match connection {
                Some(connection) => PullPage {
                    repo: repo.clone(),
                    pulls: connection
                        .get("nodes")
                        .and_then(Value::as_array)
                        .map(|nodes| {
                            nodes
                                .iter()
                                .filter_map(normalize)
                                .filter_map(|node| parse_summary(repo, &node))
                                .collect()
                        })
                        .unwrap_or_default(),
                    error: None,
                    next_cursor: next_cursor(connection),
                },
                None => PullPage {
                    repo: repo.clone(),
                    pulls: Vec::new(),
                    error: Some(alias_error(json, &alias).unwrap_or_else(|| {
                        "GitHub did not return pull requests for that repository.".to_string()
                    })),
                    next_cursor: None,
                },
            }
        })
        .collect()
}

fn fetch_batch(
    repos: &[String],
    limit: u8,
    state: Option<&str>,
    cursors: &BTreeMap<String, String>,
) -> Result<Vec<PullPage>, String> {
    let query = list_query(repos, limit, state, cursors);
    let json = run_gh_json_lenient(&["api", "graphql", "-f", &format!("query={query}")])?;
    Ok(parse_list(repos, &json))
}

/// Fold the parallel batches back into one page per repository. A failed batch
/// only affects its own repositories; when every batch fails nothing arrived,
/// so the refresh reports one request-level error instead of one per repository.
pub(super) fn combine(results: Vec<(Vec<String>, Result<Vec<PullPage>, String>)>) -> Vec<PullPage> {
    if !results.is_empty() && results.iter().all(|(_, result)| result.is_err()) {
        return vec![PullPage {
            repo: super::REQUEST_ERROR.to_string(),
            pulls: Vec::new(),
            error: results.into_iter().find_map(|(_, result)| result.err()),
            next_cursor: None,
        }];
    }
    let mut pages = Vec::new();
    for (repos, result) in results {
        match result {
            Ok(mut batch) => pages.append(&mut batch),
            Err(err) => pages.extend(repos.into_iter().map(|repo| PullPage {
                repo,
                pulls: Vec::new(),
                error: Some(err.clone()),
                next_cursor: None,
            })),
        }
    }
    pages
}

pub fn list_pulls(
    repos: &[String],
    limit: u8,
    state: Option<&str>,
    cursors: &BTreeMap<String, String>,
) -> Vec<PullPage> {
    if repos.is_empty() {
        return Vec::new();
    }
    let batches: Vec<Vec<String>> = repos
        .chunks(REPOS_PER_REQUEST)
        .map(<[String]>::to_vec)
        .collect();
    let state = state.map(str::to_string);
    let cursors = cursors.clone();
    combine(map_limited(batches, WORKERS, move |batch| {
        let result = fetch_batch(&batch, limit, state.as_deref(), &cursors);
        (batch, result)
    }))
}
