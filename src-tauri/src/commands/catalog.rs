use std::collections::HashMap;

use crate::config;
use crate::gh;
use crate::history;
use crate::models::{
    Cache, CatalogRepo, CreateOptions, CreateRepoInput, CreatedRepo, RepoDetail, Status,
    TrackedRepo,
};

use super::state::{ensure_scope, merge_fetches};
use super::status::{offload, offload_unlocked};

#[tauri::command]
pub(crate) async fn list_catalog(
    expected_account: Option<String>,
) -> Result<Vec<CatalogRepo>, String> {
    offload_unlocked(move || {
        ensure_scope(expected_account.as_deref())?;
        ensure_online()?;
        gh::list_catalog()
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
        let prev: HashMap<String, TrackedRepo> = HashMap::new();
        let fetches = gh::refresh_tracked(cfg.repos);
        let now = history::now_secs();
        config::serialized_write(move || {
            let db = config::storage()?;
            let mut store = db.load_history()?;
            let repos = merge_fetches(fetches, &prev, &mut store, now)?;
            db.save_history(&store)?;
            Ok(Cache {
                fetched_at: now,
                repos,
                history: store.repos,
            })
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
    expected_account: Option<String>,
) -> Result<config::Saved<RepoDetail>, String> {
    offload_unlocked(move || {
        ensure_scope(expected_account.as_deref())?;
        ensure_online()?;
        let mut detail = gh::repo_detail(full_name.clone())?;
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
        config::serialized_write(move || {
            let db = config::storage()?;
            let mut store = db.load_history()?;
            history::apply_fetch(&mut store, &snapshot, now);
            db.save_history(&store)?;
            if let Some(entry) = store.repos.get(&full_name) {
                detail.star_history = entry.stars.clone();
                detail.download_history = entry.downloads.clone();
            }
            Ok(config::Saved {
                fetched_at: now,
                data: detail,
                warning: None,
            })
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
