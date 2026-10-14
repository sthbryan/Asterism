use super::catalog::{platforms_from_releases, release_downloads};
use super::detail_parse::{license_name, parse_languages, parse_paths, parse_referrers, topics};
pub(crate) use super::detail_parse::{parse_traffic, traffic_status};
use super::{as_bool, as_string, as_u64, run_gh_json};
use crate::models::RepoDetail;

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
