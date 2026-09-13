use std::io::ErrorKind;
use std::process::{Command, Stdio};
use std::sync::{mpsc, Arc, Mutex};
use std::thread;

use serde_json::Value;

use crate::history::{collapse_days, day_bucket, now_secs, parse_iso_unix};
use crate::models::{
    Asset, CatalogRepo, LanguageShare, PlatformDownloads, PopularPath, Referrer, Release,
    RepoDetail, SeriesPoint, Status, TrackedRepo, Traffic, TrafficDay,
};

pub struct TrackedFetch {
    pub repo: TrackedRepo,
    pub star_seed: Option<Vec<SeriesPoint>>,
}

fn augmented_path() -> String {
    let extra = "/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin";
    match std::env::var("PATH") {
        Ok(path) if !path.is_empty() => format!("{extra}:{path}"),
        _ => extra.to_string(),
    }
}

fn run_gh(args: &[&str]) -> Result<String, String> {
    let mut cmd = Command::new("gh");
    cmd.args(args)
        .env("PATH", augmented_path())
        .env("GH_PAGER", "cat")
        .env("NO_COLOR", "1")
        .env("CLICOLOR", "0")
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());

    let output = cmd.output().map_err(|err| {
        if err.kind() == ErrorKind::NotFound {
            "GitHub CLI (gh) was not found on this machine.".to_string()
        } else {
            format!("Could not run gh: {err}")
        }
    })?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        let stdout = String::from_utf8_lossy(&output.stdout);
        let msg = if !stderr.trim().is_empty() {
            stderr.trim().to_string()
        } else if !stdout.trim().is_empty() {
            stdout.trim().to_string()
        } else {
            format!("gh exited with status {}", output.status)
        };
        return Err(msg);
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

fn run_gh_json(args: &[&str]) -> Result<Value, String> {
    let raw = run_gh(args)?;
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Ok(Value::Null);
    }
    serde_json::from_str(trimmed).map_err(|e| format!("Could not parse gh JSON: {e}"))
}

fn as_u64(value: &Value, key: &str) -> u64 {
    value
        .get(key)
        .and_then(|v| v.as_u64().or_else(|| v.as_i64().map(|n| n.max(0) as u64)))
        .unwrap_or(0)
}

fn as_bool(value: &Value, key: &str) -> bool {
    value.get(key).and_then(|v| v.as_bool()).unwrap_or(false)
}

fn as_string(value: &Value, key: &str) -> Option<String> {
    value
        .get(key)
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
}

fn owner_login(value: &Value) -> String {
    value
        .get("owner")
        .and_then(|o| o.get("login"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string()
}

pub fn status() -> Status {
    match run_gh_json(&["api", "user"]) {
        Ok(json) => {
            let login = as_string(&json, "login");
            if login.is_none() {
                Status {
                    ok: false,
                    login: None,
                    error: Some("GitHub CLI did not return an authenticated user.".to_string()),
                    hint: Some("Run gh auth login, then reopen Asterism.".to_string()),
                }
            } else {
                Status {
                    ok: true,
                    login,
                    error: None,
                    hint: None,
                }
            }
        }
        Err(err) => {
            let missing = err.contains("was not found");
            Status {
                ok: false,
                login: None,
                error: Some(err),
                hint: Some(if missing {
                    "Install GitHub CLI from https://cli.github.com and run gh auth login."
                        .to_string()
                } else {
                    "Sign in with gh auth login, then reopen Asterism.".to_string()
                }),
            }
        }
    }
}

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
    let json = run_gh_json(&[
        "api",
        "--paginate",
        "/user/repos?per_page=100&affiliation=owner,organization_member&sort=full_name",
    ])?;
    let mut repos = Vec::new();
    if let Some(arr) = json.as_array() {
        for item in arr {
            if let Some(repo) = parse_catalog_repo(item) {
                repos.push(repo);
            }
        }
    }
    repos.sort_by(|a, b| a.full_name.to_lowercase().cmp(&b.full_name.to_lowercase()));
    repos.dedup_by(|a, b| a.full_name == b.full_name);
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

fn platforms_from_releases(releases: &[Release]) -> PlatformDownloads {
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
    releases
}

fn release_downloads(full_name: &str) -> Result<(Vec<Release>, u64), String> {
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

fn fetch_tracked(full_name: String, seed_stars: bool) -> TrackedFetch {
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
                    let mut row =
                        parse_tracked(&full_name, &repo, 0, PlatformDownloads::default());
                    row.error = Some(err);
                    row
                }
            };
            let created_at = as_string(&repo, "created_at");
            let star_seed = if seed_stars && row.stars > 0 {
                star_series(&full_name, row.stars, created_at.as_deref()).ok()
            } else {
                None
            };
            TrackedFetch {
                repo: row,
                star_seed,
            }
        }
        Err(err) => TrackedFetch {
            repo: TrackedRepo {
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
            star_seed: None,
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

pub fn refresh_tracked(
    full_names: Vec<String>,
    seed_stars_for: std::collections::HashSet<String>,
) -> Vec<TrackedFetch> {
    let seed = std::sync::Arc::new(seed_stars_for);
    map_limited(full_names, 4, move |name| {
        let do_seed = seed.contains(&name);
        fetch_tracked(name, do_seed)
    })
}

fn parse_traffic_days(json: &Value, key: &str) -> Vec<TrafficDay> {
    let Some(arr) = json.get(key).and_then(|v| v.as_array()) else {
        return Vec::new();
    };
    let mut days = Vec::new();
    for item in arr {
        let ts = item
            .get("timestamp")
            .and_then(|v| v.as_str())
            .and_then(parse_iso_unix)
            .map(day_bucket)
            .unwrap_or(0);
        if ts == 0 {
            continue;
        }
        days.push(TrafficDay {
            ts,
            count: as_u64(item, "count"),
            uniques: as_u64(item, "uniques"),
        });
    }
    days.sort_by_key(|d| d.ts);
    days
}

fn parse_traffic(json: &Value, series_key: &str) -> Traffic {
    Traffic {
        count: as_u64(json, "count"),
        uniques: as_u64(json, "uniques"),
        days: parse_traffic_days(json, series_key),
    }
}

fn parse_referrers(json: &Value) -> Vec<Referrer> {
    let Some(arr) = json.as_array() else {
        return Vec::new();
    };
    let mut rows: Vec<Referrer> = arr
        .iter()
        .filter_map(|item| {
            let referrer = as_string(item, "referrer")?;
            Some(Referrer {
                referrer,
                count: as_u64(item, "count"),
                uniques: as_u64(item, "uniques"),
            })
        })
        .collect();
    rows.sort_by(|a, b| b.count.cmp(&a.count));
    rows
}

fn parse_paths(json: &Value) -> Vec<PopularPath> {
    let Some(arr) = json.as_array() else {
        return Vec::new();
    };
    let mut rows: Vec<PopularPath> = arr
        .iter()
        .filter_map(|item| {
            let path = as_string(item, "path")?;
            Some(PopularPath {
                path,
                title: as_string(item, "title"),
                count: as_u64(item, "count"),
                uniques: as_u64(item, "uniques"),
            })
        })
        .collect();
    rows.sort_by(|a, b| b.count.cmp(&a.count));
    rows
}

pub fn star_series(
    full_name: &str,
    current_stars: u64,
    created_at: Option<&str>,
) -> Result<Vec<SeriesPoint>, String> {
    if current_stars == 0 {
        return Ok(Vec::new());
    }

    let page_size = 100u64;
    let total_pages = current_stars.div_ceil(page_size).max(1);
    let max_requests = 12u64;
    let mut pages: Vec<u64> = if total_pages <= max_requests {
        (1..=total_pages).collect()
    } else {
        (0..max_requests)
            .map(|i| 1 + (i * (total_pages - 1) + (max_requests - 1) / 2) / (max_requests - 1))
            .collect()
    };
    pages.sort();
    pages.dedup();
    let fetched_all = pages.len() as u64 == total_pages;

    let mut sampled: Vec<SeriesPoint> = Vec::new();
    for page in &pages {
        let json = run_gh_json(&[
            "api",
            "-H",
            "Accept: application/vnd.github.star+json",
            &format!("/repos/{full_name}/stargazers?per_page={page_size}&page={page}"),
        ])?;
        let Some(arr) = json.as_array() else {
            break;
        };
        if arr.is_empty() {
            break;
        }
        for (i, item) in arr.iter().enumerate() {
            let Some(ts) = as_string(item, "starred_at")
                .as_deref()
                .and_then(parse_iso_unix)
            else {
                continue;
            };
            let value = if fetched_all {
                sampled.len() as u64 + 1
            } else {
                (page - 1) * page_size + i as u64 + 1
            };
            sampled.push(SeriesPoint { ts, value });
        }
        if arr.len() < page_size as usize {
            break;
        }
    }

    if fetched_all {
        sampled.sort_by_key(|p| p.ts);
        for (i, point) in sampled.iter_mut().enumerate() {
            point.value = i as u64 + 1;
        }
    }

    let mut series = collapse_days(sampled);
    if let Some(created) = created_at.and_then(parse_iso_unix) {
        let created_day = day_bucket(created);
        if series.first().map(|p| p.ts > created_day).unwrap_or(true) {
            series.insert(
                0,
                SeriesPoint {
                    ts: created_day,
                    value: 0,
                },
            );
        }
    }
    let today = day_bucket(now_secs());
    if let Some(last) = series.last_mut() {
        if day_bucket(last.ts) == today {
            last.value = current_stars;
        } else {
            series.push(SeriesPoint {
                ts: today,
                value: current_stars,
            });
        }
    } else {
        series.push(SeriesPoint {
            ts: today,
            value: current_stars,
        });
    }
    Ok(series)
}

fn parse_languages(json: &Value) -> Vec<LanguageShare> {
    let mut langs = Vec::new();
    if let Some(obj) = json.as_object() {
        for (name, bytes) in obj {
            let n = bytes
                .as_u64()
                .or_else(|| bytes.as_i64().map(|v| v.max(0) as u64))
                .unwrap_or(0);
            langs.push(LanguageShare {
                name: name.clone(),
                bytes: n,
            });
        }
    }
    langs.sort_by(|a, b| b.bytes.cmp(&a.bytes));
    langs
}

fn topics(value: &Value) -> Vec<String> {
    value
        .get("topics")
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|v| v.as_str().map(|s| s.to_string()))
                .collect()
        })
        .unwrap_or_default()
}

fn license_name(value: &Value) -> Option<String> {
    value.get("license").and_then(|lic| {
        as_string(lic, "spdx_id")
            .filter(|s| s != "NOASSERTION")
            .or_else(|| as_string(lic, "name"))
    })
}

pub fn repo_detail(full_name: String) -> Result<RepoDetail, String> {
    let repo = run_gh_json(&["api", &format!("/repos/{full_name}")])?;
    let (releases, downloads) = release_downloads(&full_name)?;
    let platforms = platforms_from_releases(&releases);

    let languages = match run_gh_json(&["api", &format!("/repos/{full_name}/languages")]) {
        Ok(json) => parse_languages(&json),
        Err(_) => Vec::new(),
    };

    let mut traffic_error = None;
    let views = match run_gh_json(&["api", &format!("/repos/{full_name}/traffic/views")]) {
        Ok(json) => Some(parse_traffic(&json, "views")),
        Err(err) => {
            traffic_error = Some(err);
            None
        }
    };
    let clones = match run_gh_json(&["api", &format!("/repos/{full_name}/traffic/clones")]) {
        Ok(json) => Some(parse_traffic(&json, "clones")),
        Err(err) => {
            if traffic_error.is_none() {
                traffic_error = Some(err);
            }
            None
        }
    };
    let referrers = match run_gh_json(&[
        "api",
        &format!("/repos/{full_name}/traffic/popular/referrers"),
    ]) {
        Ok(json) => parse_referrers(&json),
        Err(_) => Vec::new(),
    };
    let paths = match run_gh_json(&[
        "api",
        &format!("/repos/{full_name}/traffic/popular/paths"),
    ]) {
        Ok(json) => parse_paths(&json),
        Err(_) => Vec::new(),
    };

    Ok(RepoDetail {
        full_name: as_string(&repo, "full_name").unwrap_or(full_name),
        description: as_string(&repo, "description"),
        homepage: as_string(&repo, "homepage"),
        private: as_bool(&repo, "private"),
        visibility: as_string(&repo, "visibility"),
        archived: as_bool(&repo, "archived"),
        is_template: as_bool(&repo, "is_template"),
        language: as_string(&repo, "language"),
        languages,
        stars: as_u64(&repo, "stargazers_count"),
        forks: as_u64(&repo, "forks_count"),
        watchers: as_u64(&repo, "subscribers_count"),
        open_issues: as_u64(&repo, "open_issues_count"),
        network_count: as_u64(&repo, "network_count"),
        size: as_u64(&repo, "size"),
        license: license_name(&repo),
        default_branch: as_string(&repo, "default_branch"),
        topics: topics(&repo),
        created_at: as_string(&repo, "created_at"),
        updated_at: as_string(&repo, "updated_at"),
        pushed_at: as_string(&repo, "pushed_at"),
        downloads,
        views,
        clones,
        traffic_error,
        releases,
        platforms,
        referrers,
        paths,
        star_history: Vec::new(),
        download_history: Vec::new(),
    })
}
