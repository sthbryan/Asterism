use std::collections::HashMap;

use crate::config;
use crate::gh;
use crate::history;
use crate::models::{
    Cache, CatalogRepo, CreateOptions, CreateRepoInput, CreatedRepo, RepoDetail, Status,
    TrackedRepo, Traffic, TrafficStatus,
};

use super::state::{ensure_scope, merge_fetches};
use super::status::{offload, offload_unlocked};

pub(crate) fn merge_cached_traffic(
    current: &mut Option<Traffic>,
    status: &mut TrafficStatus,
    saved: &mut Option<Traffic>,
) {
    if current.is_none() && !matches!(status, TrafficStatus::Ok) {
        if let Some(cached) = saved.take() {
            *current = Some(cached);
            if matches!(status, TrafficStatus::Unavailable) {
                *status = TrafficStatus::Ok;
            }
        }
    }
}

#[tauri::command]
pub(crate) async fn list_catalog(
    expected_account: Option<String>,
) -> Result<Vec<CatalogRepo>, String> {
    offload_unlocked(move || {
        ensure_scope(expected_account.as_deref())?;
        ensure_online()?;
        let rows = gh::list_catalog()?;
        config::serialized(move || config::storage()?.save_catalog(rows))
    })
    .await?
}

#[tauri::command]
pub(crate) async fn refresh_tracked(expected_account: Option<String>) -> Result<Cache, String> {
    offload_unlocked(move || {
        ensure_scope(expected_account.as_deref())?;
        ensure_online()?;
        let db = config::storage()?;
        let cfg = db.load_config()?;
        let previous = db.load_cache()?;
        let prev: HashMap<String, TrackedRepo> = previous
            .map(|cache| {
                cache
                    .repos
                    .into_iter()
                    .map(|repo| (repo.full_name.clone(), repo))
                    .collect()
            })
            .unwrap_or_default();
        let fetches = gh::refresh_tracked(cfg.repos);
        let now = history::now_secs();
        config::serialized(move || {
            let db = config::storage()?;
            let mut store = db.load_history()?;
            let repos = merge_fetches(fetches, &prev, &mut store, now)?;
            db.save_history(&store)?;
            db.save_cache(repos, store.repos)
        })
    })
    .await?
}

#[tauri::command]
pub(crate) async fn list_create_options(
    expected_account: Option<String>,
) -> Result<CreateOptions, String> {
    offload(move || {
        ensure_scope(expected_account.as_deref())?;
        ensure_online()?;
        gh::list_create_options()
    })
    .await?
}

#[tauri::command]
pub(crate) async fn create_repo(
    input: CreateRepoInput,
    expected_account: Option<String>,
) -> Result<CreatedRepo, String> {
    offload(move || {
        ensure_scope(expected_account.as_deref())?;
        ensure_online()?;
        gh::create_repo(input)
    })
    .await?
}

#[tauri::command]
pub(crate) async fn get_repo_detail(
    full_name: String,
    offline: bool,
    expected_account: Option<String>,
) -> Result<config::Saved<RepoDetail>, String> {
    offload_unlocked(move || {
        ensure_scope(expected_account.as_deref())?;
        let db = config::storage()?;
        let old = db.load_detail(&full_name)?;
        if offline {
            return old.ok_or(
                "This detail has not been saved. Connect and open it once to use it offline."
                    .into(),
            );
        }
        let mut detail = match ensure_online().and_then(|_| gh::repo_detail(full_name.clone())) {
            Ok(detail) => detail,
            Err(error) => {
                return old
                    .map(|mut saved| {
                        saved.warning = Some(error.clone());
                        saved
                    })
                    .ok_or(error)
            }
        };
        if let (Some(_error), Some(mut saved)) = (&detail.traffic_error, old) {
            let views_failed = !matches!(detail.views_status, crate::models::TrafficStatus::Ok)
                && detail.views.is_none();
            let clones_failed = !matches!(detail.clones_status, crate::models::TrafficStatus::Ok)
                && detail.clones.is_none();

            if views_failed {
                merge_cached_traffic(
                    &mut detail.views,
                    &mut detail.views_status,
                    &mut saved.data.views,
                );
            }
            if clones_failed {
                merge_cached_traffic(
                    &mut detail.clones,
                    &mut detail.clones_status,
                    &mut saved.data.clones,
                );
            }
        }
        let now = history::now_secs();
        let snapshot = TrackedRepo {
            fetched_at: Some(now),
            full_name: detail.full_name.clone(),
            description: detail.description.clone(),
            private: detail.private,
            language: detail.language.clone(),
            stars: detail.stars,
            forks: detail.forks,
            downloads: detail.downloads,
            platforms: detail.platforms.clone(),
            stars_delta: None,
            forks_delta: None,
            downloads_delta: None,
            error: None,
        };
        config::serialized(move || {
            let db = config::storage()?;
            let mut store = db.load_history()?;
            history::apply_fetch(&mut store, &snapshot, now);
            db.save_history(&store)?;
            if let Some(entry) = store.repos.get(&full_name) {
                detail.star_history = entry.stars.clone();
                detail.download_history = entry.downloads.clone();
            }
            db.save_detail(detail)
        })
    })
    .await?
}

pub(crate) fn account_key(status: &Status) -> Result<String, String> {
    Ok(format!(
        "{}/{}",
        gh::host(),
        status
            .login
            .as_deref()
            .ok_or("GitHub account is unavailable.")?
    )
    .to_lowercase())
}
pub(crate) fn ensure_online() -> Result<(), String> {
    let Some(status) = gh::last_status() else {
        return Ok(());
    };
    if !status.ok {
        return Err(status.error.unwrap_or("GitHub is unavailable.".into()));
    }
    if config::storage()?.account()?.as_deref() != Some(&account_key(&status)?) {
        return Err("GitHub account changed. Check connection to load that account’s data.".into());
    }
    Ok(())
}
#[tauri::command]
pub(crate) async fn get_cached_detail(
    full_name: String,
    expected_account: Option<String>,
) -> Result<Option<config::Saved<RepoDetail>>, String> {
    offload_unlocked(move || {
        ensure_scope(expected_account.as_deref())?;
        config::storage()?.load_detail(&full_name)
    })
    .await?
}
