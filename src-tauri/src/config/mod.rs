//! Versioned Plugin Store persistence. Callers serialize compound operations.
mod cache;
mod paths;
mod store;
#[cfg(test)]
mod tests;

pub(crate) use paths::{account_file, bound_cache, legacy_read, pull_detail_key};

use crate::models::*;
use serde::{Deserialize, Serialize};
use std::{
    collections::BTreeMap,
    path::PathBuf,
    sync::OnceLock,
};
use tauri::{AppHandle, Manager, Runtime};

pub fn serialized_write<T>(f: impl FnOnce() -> T) -> T {
    static WRITE_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());
    let _guard = WRITE_LOCK.lock().unwrap_or_else(|e| e.into_inner());
    f()
}

static APP: OnceLock<AppHandle> = OnceLock::new();
pub(crate) const VERSION: u32 = 1;
pub(crate) const MAX_CACHE_BYTES: usize = 16 * 1024 * 1024;
pub(crate) const MAX_DETAILS: usize = 100;
pub(crate) const MAX_POINTS: usize = 180;
pub(crate) const MAX_HISTORY_REPOS: usize = 500;

pub fn init(app: AppHandle) {
    let _ = APP.set(app);
}
pub fn storage() -> Result<Storage<tauri::Wry>, String> {
    let app = APP.get().ok_or("Storage is not initialized.")?.clone();
    let root = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let home = std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(PathBuf::from)
        .ok_or("Could not resolve the home directory.")?;
    Ok(Storage { app, root, home })
}

#[derive(Serialize, Deserialize)]
pub(crate) struct Document<T> {
    pub(crate) version: u32,
    pub(crate) data: T,
}
#[derive(Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
pub(crate) struct Preferences {
    pub(crate) theme: ThemePref,
    pub(crate) transparency: bool,
    pub(crate) locale: Option<Locale>,
    pub(crate) last_account: Option<String>,
    pub(crate) migrated: bool,
}
#[derive(Default, Serialize, Deserialize)]
#[serde(default)]
pub(crate) struct Projects {
    pub(crate) repos: Vec<String>,
    pub(crate) folders: BTreeMap<String, Vec<String>>,
    pub(crate) legacy_imported: bool,
}
#[derive(Default, Serialize, Deserialize)]
#[serde(default)]
pub(crate) struct AccountCache {
    pub(crate) summary: Option<Cache>,
    pub(crate) catalog: Option<Saved<Vec<CatalogRepo>>>,
    pub(crate) details: BTreeMap<String, Saved<RepoDetail>>,
    pub(crate) pull_requests: BTreeMap<String, serde_json::Value>,
    pub(crate) pull_list: Option<Saved<Vec<PullRequestSummary>>>,
    pub(crate) pull_result: Option<Saved<PullListResult>>,
    pub(crate) pull_details: BTreeMap<String, Saved<PullRequestDetail>>,
    pub(crate) pull_diffs: BTreeMap<String, Saved<String>>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Saved<T> {
    pub fetched_at: u64,
    pub data: T,
    pub warning: Option<String>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalState {
    pub account: Option<String>,
    pub config: Config,
    pub cache: Option<Cache>,
    pub catalog: Option<Saved<Vec<CatalogRepo>>>,
    pub legacy_available: bool,
    pub data_path: String,
}

pub struct Storage<R: Runtime> {
    pub(crate) app: AppHandle<R>,
    pub(crate) root: PathBuf,
    pub(crate) home: PathBuf,
}
