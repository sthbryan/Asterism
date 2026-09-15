use std::sync::{mpsc, Arc, Mutex};
use std::thread;

use serde_json::Value;

use crate::history::{collapse_days, day_bucket, now_secs, parse_iso_unix};
use crate::models::{
    Asset, CatalogRepo, CreateOptions, CreateRepoInput, CreatedRepo, LanguageShare, LicenseOption,
    PlatformDownloads, PopularPath, Referrer, Release, RepoDetail, SeriesPoint, Status,
    TrackedRepo, Traffic, TrafficDay,
};

mod process;

use process::run_gh_json;
pub(crate) use process::{run_gh_env, tool_version};

pub struct TrackedFetch {
    pub repo: TrackedRepo,
    pub star_seed: Option<Vec<SeriesPoint>>,
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

pub fn host() -> String {
    std::env::var("GH_HOST")
        .ok()
        .filter(|h| !h.is_empty())
        .unwrap_or("github.com".into())
        .to_lowercase()
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
                    hint: Some("Run gh auth login, then check the connection again.".to_string()),
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
                    "Sign in with gh auth login, then check the connection again.".to_string()
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
    } // NB: suelta el Value temporal antes de ordenar/dedup.
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
    releases.shrink_to_fit();
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

fn fetch_tracked(full_name: String, seed_stars: bool) -> TrackedFetch {
    match run_gh_json(&["api", &format!("/repos/{full_name}")]) {
        Ok(repo) => {
            // created_at se extrae antes: el Value de repo se suelta en cuanto
            // se construye la fila, sin convivir con el seed de estrellas.
            let created_at = as_string(&repo, "created_at");
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
    let days = parse_traffic_days(json, series_key);
    let sample_from = days.first().map(|d| d.ts);
    let sample_to = days.last().map(|d| d.ts);
    Traffic {
        count: as_u64(json, "count"),
        uniques: as_u64(json, "uniques"),
        days,
        fetched_at: Some(now_secs()),
        sample_from,
        sample_to,
    }
}

fn traffic_status(err: &str) -> crate::models::TrafficStatus {
    if err.contains("403") || err.to_ascii_lowercase().contains("forbidden") {
        crate::models::TrafficStatus::Forbidden
    } else {
        crate::models::TrafficStatus::Error
    }
}

#[cfg(test)]
mod traffic_contract_tests {
    use super::*;
    use crate::models::TrafficStatus;

    #[test]
    fn uniques_are_period_total_not_daily_sum() {
        let json = serde_json::json!({"count": 9, "uniques": 7,
            "views": [{"timestamp":"2026-09-10T00:00:00Z","count":4,"uniques":3},
                      {"timestamp":"2026-09-11T00:00:00Z","count":5,"uniques":3}]});
        let t = parse_traffic(&json, "views");
        assert_eq!(t.uniques, 7);
        assert_eq!(t.days.iter().map(|d| d.uniques).sum::<u64>(), 6);
        assert!(t.sample_from.is_some() && t.sample_to.is_some());
    }

    #[test]
    fn legacy_traffic_deserializes_without_metadata() {
        let t: Traffic =
            serde_json::from_value(serde_json::json!({"count": 2, "uniques": 1, "days": []}))
                .unwrap();
        assert_eq!(t.fetched_at, None);
        assert_eq!(t.sample_from, None);
    }

    #[test]
    fn status_distinguishes_forbidden_from_other_errors() {
        assert_eq!(
            traffic_status("HTTP 403: Forbidden"),
            TrafficStatus::Forbidden
        );
        assert_eq!(traffic_status("network timeout"), TrafficStatus::Error);
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
    // Tope de peticiones: ya acota el trabajo en memoria (12 páginas × 100
    // stargazers como máximo vivo a la vez, una página por iteración).
    const MAX_STAR_PAGES: u64 = 12;
    let max_requests = MAX_STAR_PAGES;
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
        // El JSON de cada página vive solo dentro del bloque: se suelta
        // antes de acumular el lote en `sampled`.
        let (batch, short_page) = {
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
            let mut batch = Vec::with_capacity(arr.len());
            for (i, item) in arr.iter().enumerate() {
                let Some(ts) = as_string(item, "starred_at")
                    .as_deref()
                    .and_then(parse_iso_unix)
                else {
                    continue;
                };
                let value = if fetched_all {
                    sampled.len() as u64 + batch.len() as u64 + 1
                } else {
                    (page - 1) * page_size + i as u64 + 1
                };
                batch.push(SeriesPoint { ts, value });
            }
            (batch, arr.len() < page_size as usize)
        };
        sampled.extend(batch);
        if short_page {
            break;
        }
    }
    sampled.shrink_to_fit();

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
    // Se extrae todo lo necesario del JSON del repo y se suelta antes de las
    // siguientes llamadas (releases, languages, traffic): así el Value grande
    // no convive en memoria con los demás.
    let resolved_name = as_string(&repo, "full_name").unwrap_or_else(|| full_name.clone());
    let description = as_string(&repo, "description");
    let homepage = as_string(&repo, "homepage");
    let private = as_bool(&repo, "private");
    let visibility = as_string(&repo, "visibility");
    let archived = as_bool(&repo, "archived");
    let is_template = as_bool(&repo, "is_template");
    let language = as_string(&repo, "language");
    let stars = as_u64(&repo, "stargazers_count");
    let forks = as_u64(&repo, "forks_count");
    let watchers = as_u64(&repo, "subscribers_count");
    let open_issues = as_u64(&repo, "open_issues_count");
    let network_count = as_u64(&repo, "network_count");
    let size = as_u64(&repo, "size");
    let license = license_name(&repo);
    let default_branch = as_string(&repo, "default_branch");
    let topics = topics(&repo);
    let created_at = as_string(&repo, "created_at");
    let updated_at = as_string(&repo, "updated_at");
    let pushed_at = as_string(&repo, "pushed_at");
    drop(repo);

    let (releases, downloads) = release_downloads(&full_name)?;
    let platforms = platforms_from_releases(&releases);

    let mut traffic_error = None;
    let languages = match run_gh_json(&["api", &format!("/repos/{full_name}/languages")]) {
        Ok(json) => parse_languages(&json),
        Err(err) => {
            traffic_error = Some(err);
            Vec::new()
        }
    };

    let (views, views_status) =
        match run_gh_json(&["api", &format!("/repos/{full_name}/traffic/views")]) {
            Ok(json) => (
                Some(parse_traffic(&json, "views")),
                crate::models::TrafficStatus::Ok,
            ),
            Err(err) => {
                traffic_error = Some(err);
                (None, traffic_status(traffic_error.as_deref().unwrap_or("")))
            }
        };
    let (clones, clones_status) =
        match run_gh_json(&["api", &format!("/repos/{full_name}/traffic/clones")]) {
            Ok(json) => (
                Some(parse_traffic(&json, "clones")),
                crate::models::TrafficStatus::Ok,
            ),
            Err(err) => {
                if traffic_error.is_none() {
                    traffic_error = Some(err.clone());
                }
                (None, traffic_status(&err))
            }
        };
    let referrers = match run_gh_json(&[
        "api",
        &format!("/repos/{full_name}/traffic/popular/referrers"),
    ]) {
        Ok(json) => parse_referrers(&json),
        Err(err) => {
            traffic_error = Some(err);
            Vec::new()
        }
    };
    let paths = match run_gh_json(&["api", &format!("/repos/{full_name}/traffic/popular/paths")]) {
        Ok(json) => parse_paths(&json),
        Err(err) => {
            traffic_error = Some(err);
            Vec::new()
        }
    };

    Ok(RepoDetail {
        full_name: resolved_name,
        description,
        homepage,
        private,
        visibility,
        archived,
        is_template,
        language,
        languages,
        stars,
        forks,
        watchers,
        open_issues,
        network_count,
        size,
        license,
        default_branch,
        topics,
        created_at,
        updated_at,
        pushed_at,
        downloads,
        views,
        clones,
        traffic_error,
        views_status,
        clones_status,
        releases,
        platforms,
        referrers,
        paths,
        star_history: Vec::new(),
        download_history: Vec::new(),
    })
}

fn validate_repo_name(name: &str) -> Result<(), String> {
    if name.is_empty() {
        return Err("Repository name is required.".to_string());
    }
    if name.len() > 100 {
        return Err("Repository name must be 100 characters or fewer.".to_string());
    }
    if name == "." || name == ".." || name.ends_with(".git") {
        return Err("That repository name is not allowed.".to_string());
    }
    if !name
        .chars()
        .all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '_' || c == '-')
    {
        return Err("Use letters, numbers, hyphens, underscores, or periods.".to_string());
    }
    Ok(())
}

pub fn list_create_options() -> Result<CreateOptions, String> {
    let user = run_gh_json(&["api", "user"])?;
    let login = as_string(&user, "login")
        .ok_or_else(|| "GitHub CLI did not return an authenticated user.".to_string())?;
    let mut owners = vec![login];
    if let Ok(orgs) = run_gh_json(&["api", "--paginate", "/user/orgs?per_page=100"]) {
        if let Some(arr) = orgs.as_array() {
            for item in arr {
                if let Some(org) = as_string(item, "login") {
                    if !owners
                        .iter()
                        .any(|existing| existing.eq_ignore_ascii_case(&org))
                    {
                        owners.push(org);
                    }
                }
            }
        }
    }
    let gitignores = match run_gh_json(&["api", "gitignore/templates"]) {
        Ok(json) => json
            .as_array()
            .map(|items| {
                items
                    .iter()
                    .filter_map(|item| item.as_str())
                    .map(|s| s.to_string())
                    .collect()
            })
            .unwrap_or_default(),
        Err(_) => Vec::new(),
    };
    let licenses = match run_gh_json(&["api", "licenses"]) {
        Ok(json) => json
            .as_array()
            .map(|items| {
                items
                    .iter()
                    .filter_map(|item| {
                        let key = as_string(item, "key")?;
                        let name = as_string(item, "name").unwrap_or_else(|| key.clone());
                        Some(LicenseOption { key, name })
                    })
                    .collect()
            })
            .unwrap_or_default(),
        Err(_) => Vec::new(),
    };
    Ok(CreateOptions {
        owners,
        gitignores,
        licenses,
    })
}

pub fn create_repo(input: CreateRepoInput) -> Result<CreatedRepo, String> {
    let owner = input.owner.trim();
    let name = input.name.trim();
    if owner.is_empty() {
        return Err("Owner is required.".to_string());
    }
    if owner.len() > 39
        || !owner.chars().all(|c| c.is_ascii_alphanumeric() || c == '-')
        || owner.starts_with('-')
        || owner.ends_with('-')
    {
        return Err("Invalid repository owner.".to_string());
    }
    validate_repo_name(name)?;
    let full_name = format!("{owner}/{name}");
    let mut args: Vec<String> = vec!["repo".to_string(), "create".to_string(), full_name.clone()];
    args.push(if input.private {
        "--private".to_string()
    } else {
        "--public".to_string()
    });
    if let Some(description) = input
        .description
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        args.push("-d".to_string());
        args.push(description.to_string());
    }
    if input.add_readme {
        args.push("--add-readme".to_string());
    }
    if let Some(gitignore) = input
        .gitignore
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        args.push("-g".to_string());
        args.push(gitignore.to_string());
    }
    if let Some(license) = input
        .license
        .as_deref()
        .map(str::trim)
        .filter(|value| !value.is_empty())
    {
        args.push("-l".to_string());
        args.push(license.to_string());
    }
    let refs: Vec<&str> = args.iter().map(String::as_str).collect();
    run_gh_env(&refs, &[("GH_PROMPT_DISABLED", "1")])?;
    Ok(CreatedRepo {
        full_name: full_name.clone(),
        html_url: format!("https://github.com/{full_name}"),
        private: input.private,
    })
}

#[cfg(test)]
mod create_tests {
    use super::process::first_line;
    use super::*;

    #[test]
    fn repository_names_reject_paths_and_reserved_names() {
        for name in ["", ".", "..", "repo.git", "owner/repo", "a b", "é", "a\\b"] {
            assert!(validate_repo_name(name).is_err(), "{name}");
        }
        assert!(validate_repo_name(&"a".repeat(101)).is_err());
        for name in ["my-project", ".github", "project_2.0"] {
            assert!(validate_repo_name(name).is_ok(), "{name}");
        }
    }

    #[test]
    fn unsafe_owner_is_rejected_before_running_gh() {
        let result = create_repo(CreateRepoInput {
            owner: "--help".into(),
            name: "test".into(),
            description: None,
            private: true,
            add_readme: true,
            gitignore: None,
            license: None,
        });
        assert_eq!(result.unwrap_err(), "Invalid repository owner.");
    }

    #[test]
    fn missing_tool_reports_technical_error_without_failing() {
        let (version, error) = tool_version("asterism-definitely-missing-binary", &["--version"]);
        assert_eq!(version, None);
        assert!(error.unwrap().contains("was not found"));
    }

    #[test]
    fn first_line_trims_to_a_single_line() {
        assert_eq!(
            first_line("gh version 2.74.2 (2025-01-01)\nmore"),
            "gh version 2.74.2 (2025-01-01)"
        );
        assert_eq!(first_line("  \n"), "");
    }
}
