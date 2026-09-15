use std::collections::HashMap;
use std::path::Path;
use std::process::Command;

use crate::config;
use crate::models::TrackedRepo;
use crate::history;

use super::catalog::ensure_online;
use super::local::{checkout_probe, remote_matches};
use super::status::offload;

#[tauri::command]
pub(crate) async fn get_local_state() -> Result<config::LocalState, String> {
    offload(|| config::storage()?.local_state()).await?
}
#[tauri::command]
pub(crate) async fn use_legacy_data() -> Result<config::LocalState, String> {
    offload(move || {
        let db = config::storage()?;
        db.activate("legacy".into())?;
        db.local_state()
    })
    .await?
}
#[tauri::command]
pub(crate) async fn import_legacy_data(
    expected_account: Option<String>,
) -> Result<config::LocalState, String> {
    offload(move || {
        ensure_scope(expected_account.as_deref())?;
        ensure_online()?;
        config::storage()?.import_legacy()
    })
    .await?
}
#[tauri::command]
pub(crate) async fn clear_local_cache(
    expected_account: Option<String>,
) -> Result<config::LocalState, String> {
    offload(move || {
        ensure_scope(expected_account.as_deref())?;
        config::storage()?.clear_cache()
    })
    .await?
}

pub(crate) fn ensure_scope(expected: Option<&str>) -> Result<(), String> {
    if config::storage()?.account()?.as_deref() != expected {
        return Err("Account changed. Reload the current account before continuing.".into());
    }
    Ok(())
}

pub(crate) fn require_ready_checkout(
    full_name: &str,
    path: &str,
    expected_account: Option<&str>,
) -> Result<std::path::PathBuf, String> {
    ensure_scope(expected_account)?;
    let registered = config::storage()?
        .checkout_folders()?
        .get(full_name)
        .is_some_and(|paths| paths.iter().any(|p| p == path));
    if !registered {
        return Err("LOCAL_CHECKOUT_UNAVAILABLE".into());
    }
    let probe = checkout_probe(full_name, path);
    if probe.status != "ready" {
        return Err("LOCAL_CHECKOUT_UNAVAILABLE".into());
    }
    Path::new(path)
        .canonicalize()
        .map_err(|_| "LOCAL_INVALID_PATH".to_string())
}

pub(crate) fn matching_remote_name(full: &str, dir: &Path) -> Option<String> {
    let out = Command::new("git")
        .args(["-C"])
        .arg(dir)
        .args(["remote"])
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    let stdout = String::from_utf8_lossy(&out.stdout).into_owned();
    stdout.lines().map(str::trim).find_map(|name| {
        if name.is_empty() {
            return None;
        }
        let url = Command::new("git")
            .args(["-C"])
            .arg(dir)
            .args(["remote", "get-url", name])
            .output()
            .ok()
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())?;
        remote_matches(full, &url).then(|| name.to_string())
    })
}

pub(crate) fn merge_fetches(
    fetches: Vec<TrackedRepo>,
    prev: &HashMap<String, TrackedRepo>,
    store: &mut crate::models::HistoryStore,
    now: u64,
) -> Result<Vec<TrackedRepo>, String> {
    if !fetches.is_empty() && fetches.iter().all(|f| f.error.is_some()) {
        return Err(format!(
            "No repositories could be refreshed. Saved data was kept. {}",
            fetches[0].error.as_deref().unwrap_or_default()
        ));
    }
    let repos = fetches
        .into_iter()
        .filter_map(|fetch| {
            if fetch.error.is_some() {
                return prev.get(&fetch.full_name).cloned().map(|mut old| {
                    old.error = fetch.error;
                    old.stars_delta = None;
                    old.forks_delta = None;
                    old.downloads_delta = None;
                    old
                });
            }
            history::apply_fetch(store, &fetch, now);
            let mut repo = fetch;
            if let Some(old) = prev.get(&repo.full_name) {
                repo.stars_delta = Some(repo.stars as i64 - old.stars as i64);
                repo.forks_delta = Some(repo.forks as i64 - old.forks as i64);
                repo.downloads_delta = Some(repo.downloads as i64 - old.downloads as i64);
            }
            repo.fetched_at = Some(now);
            Some(repo)
        })
        .collect();
    Ok(repos)
}
