use serde_json::Value;

use super::catalog::{platforms_from_releases, release_downloads};
use super::{as_bool, as_string, as_u64, run_gh_json};
use crate::history::{day_bucket, now_secs, parse_iso_unix};
use crate::models::{LanguageShare, PopularPath, Referrer, RepoDetail, Traffic, TrafficDay};

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

pub(crate) fn parse_traffic(json: &Value, series_key: &str) -> Traffic {
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

pub(crate) fn traffic_status(err: &str) -> crate::models::TrafficStatus {
    if err.contains("403") || err.to_ascii_lowercase().contains("forbidden") {
        crate::models::TrafficStatus::Forbidden
    } else {
        crate::models::TrafficStatus::Error
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

fn joined<T>(handle: std::thread::ScopedJoinHandle<'_, Result<T, String>>) -> Result<T, String> {
    handle
        .join()
        .unwrap_or_else(|_| Err("A GitHub request failed unexpectedly.".into()))
}

pub fn repo_detail(full_name: String) -> Result<RepoDetail, String> {
    let (repo, releases, languages, views, clones, referrers, paths) =
        std::thread::scope(|scope| {
            let repo = scope.spawn(|| run_gh_json(&["api", &format!("/repos/{full_name}")]));
            let releases = scope.spawn(|| release_downloads(&full_name));
            let languages =
                scope.spawn(|| run_gh_json(&["api", &format!("/repos/{full_name}/languages")]));
            let views =
                scope.spawn(|| run_gh_json(&["api", &format!("/repos/{full_name}/traffic/views")]));
            let clones = scope
                .spawn(|| run_gh_json(&["api", &format!("/repos/{full_name}/traffic/clones")]));
            let referrers = scope.spawn(|| {
                run_gh_json(&[
                    "api",
                    &format!("/repos/{full_name}/traffic/popular/referrers"),
                ])
            });
            let paths = scope.spawn(|| {
                run_gh_json(&["api", &format!("/repos/{full_name}/traffic/popular/paths")])
            });
            (
                joined(repo),
                joined(releases),
                joined(languages),
                joined(views),
                joined(clones),
                joined(referrers),
                joined(paths),
            )
        });
    let repo = repo?;
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

    let (releases, downloads) = releases?;
    let platforms = platforms_from_releases(&releases);

    let mut traffic_error = None;
    let languages = match languages {
        Ok(json) => parse_languages(&json),
        Err(err) => {
            traffic_error = Some(err);
            Vec::new()
        }
    };

    let (views, views_status) = match views {
        Ok(json) => (
            Some(parse_traffic(&json, "views")),
            crate::models::TrafficStatus::Ok,
        ),
        Err(err) => {
            traffic_error = Some(err);
            (None, traffic_status(traffic_error.as_deref().unwrap_or("")))
        }
    };
    let (clones, clones_status) = match clones {
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
    let referrers = match referrers {
        Ok(json) => parse_referrers(&json),
        Err(err) => {
            traffic_error = Some(err);
            Vec::new()
        }
    };
    let paths = match paths {
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

