use std::sync::{mpsc, Arc, Mutex};
use std::thread;

use serde_json::Value;

use super::{as_bool, as_string, as_u64, owner_login, run_gh_json};
use crate::models::{Asset, CatalogRepo, PlatformDownloads, Release, TrackedRepo};

fn parse_catalog_repo(value: &Value) -> Option<CatalogRepo> {
    let full_name = as_string(value, "full_name")?;
    let owner = owner_login(value);
    let name = as_string(value, "name").unwrap_or_else(|| full_name.clone());
    Some(CatalogRepo {
        full_name,
        owner,
        name,
        description: as_string(value, "description"),
        private: as_bool(value, "private"),
        language: as_string(value, "language"),
        archived: as_bool(value, "archived"),
        fork: as_bool(value, "fork"),
        pushed_at: as_string(value, "pushed_at"),
        stars: as_u64(value, "stargazers_count"),
        forks: as_u64(value, "forks_count"),
    })
}

pub fn list_catalog() -> Result<Vec<CatalogRepo>, String> {
    let mut repos = Vec::new();
    {
        let json = run_gh_json(&[
            "api",
            "--paginate",
            "/user/repos?per_page=100&affiliation=owner,organization_member&sort=full_name",
        ])?;
        if let Some(arr) = json.as_array() {
            for item in arr {
                if let Some(repo) = parse_catalog_repo(item) {
                    repos.push(repo);
                }
            }
        }
    }
    repos.sort_by(|a, b| a.full_name.to_lowercase().cmp(&b.full_name.to_lowercase()));
    repos.dedup_by(|a, b| a.full_name == b.full_name);
    repos.shrink_to_fit();
    Ok(repos)
}

fn parse_assets(value: &Value) -> (Vec<Asset>, u64) {
    let mut assets = Vec::new();
    let mut total = 0u64;
    if let Some(arr) = value.get("assets").and_then(|v| v.as_array()) {
        for item in arr {
            let count = as_u64(item, "download_count");
            total = total.saturating_add(count);
            assets.push(Asset {
                name: as_string(item, "name").unwrap_or_else(|| "asset".to_string()),
                download_count: count,
                size: as_u64(item, "size"),
                content_type: as_string(item, "content_type"),
            });
        }
    }
    (assets, total)
}

pub(crate) fn platforms_from_releases(releases: &[Release]) -> PlatformDownloads {
    let mut platforms = PlatformDownloads::default();
    for release in releases {
        for asset in &release.assets {
            platforms.add(&asset.name, asset.download_count);
        }
    }
    platforms
}

fn parse_releases(json: &Value) -> Vec<Release> {
    let mut releases = Vec::new();
    let arr = match json.as_array() {
        Some(items) => items,
        None => return releases,
    };
    for item in arr {
        let (assets, downloads) = parse_assets(item);
        releases.push(Release {
            tag: as_string(item, "tag_name").unwrap_or_else(|| "untagged".to_string()),
            name: as_string(item, "name"),
            published_at: as_string(item, "published_at"),
            draft: as_bool(item, "draft"),
            prerelease: as_bool(item, "prerelease"),
            downloads,
            assets,
        });
    }
    releases.shrink_to_fit();
    releases
}

pub(crate) fn release_downloads(full_name: &str) -> Result<(Vec<Release>, u64), String> {
    let json = run_gh_json(&[
        "api",
        "--paginate",
        &format!("/repos/{full_name}/releases?per_page=100"),
    ])?;
    let releases = parse_releases(&json);
    let total = releases
        .iter()
        .fold(0u64, |acc, r| acc.saturating_add(r.downloads));
    Ok((releases, total))
}

fn parse_tracked(
    full_name: &str,
    repo: &Value,
    downloads: u64,
    platforms: PlatformDownloads,
) -> TrackedRepo {
    TrackedRepo {
        fetched_at: None,
        full_name: as_string(repo, "full_name").unwrap_or_else(|| full_name.to_string()),
        description: as_string(repo, "description"),
        private: as_bool(repo, "private"),
        language: as_string(repo, "language"),
        stars: as_u64(repo, "stargazers_count"),
        forks: as_u64(repo, "forks_count"),
        downloads,
        platforms,
        stars_delta: None,
        forks_delta: None,
        downloads_delta: None,
        error: None,
    }
}

fn fetch_tracked(full_name: String) -> TrackedRepo {
    match run_gh_json(&["api", &format!("/repos/{full_name}")]) {
        Ok(repo) => {
            let row = match release_downloads(&full_name) {
                Ok((releases, downloads)) => parse_tracked(
                    &full_name,
                    &repo,
                    downloads,
                    platforms_from_releases(&releases),
                ),
                Err(err) => {
                    let mut row = parse_tracked(&full_name, &repo, 0, PlatformDownloads::default());
                    row.error = Some(err);
                    row
                }
            };
            drop(repo);
            row
        }
        Err(err) => TrackedRepo {
            fetched_at: None,
            full_name,
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
            error: Some(err),
        },
    }
}

fn map_limited<T, R, F>(items: Vec<T>, limit: usize, f: F) -> Vec<R>
where
    T: Send + 'static,
    R: Send + 'static,
    F: Fn(T) -> R + Send + Sync + 'static,
{
    if items.is_empty() {
        return Vec::new();
    }
    let n = items.len();
    let workers = limit.max(1).min(n);
    let (job_tx, job_rx) = mpsc::channel::<(usize, T)>();
    let job_rx = Arc::new(Mutex::new(job_rx));
    let (out_tx, out_rx) = mpsc::channel::<(usize, R)>();
    let f = Arc::new(f);

    for _ in 0..workers {
        let job_rx = Arc::clone(&job_rx);
        let out_tx = out_tx.clone();
        let f = Arc::clone(&f);
        thread::spawn(move || loop {
            let next = { job_rx.lock().ok().and_then(|rx| rx.recv().ok()) };
            match next {
                Some((i, item)) => {
                    let _ = out_tx.send((i, f(item)));
                }
                None => break,
            }
        });
    }

    for (i, item) in items.into_iter().enumerate() {
        let _ = job_tx.send((i, item));
    }
    drop(job_tx);
    drop(out_tx);

    let mut slots: Vec<Option<R>> = (0..n).map(|_| None).collect();
    for _ in 0..n {
        if let Ok((i, value)) = out_rx.recv() {
            slots[i] = Some(value);
        }
    }
    slots.into_iter().flatten().collect()
}

pub fn refresh_tracked(full_names: Vec<String>) -> Vec<TrackedRepo> {
    map_limited(full_names, 4, fetch_tracked)
}
