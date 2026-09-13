use std::fs;
use std::path::PathBuf;

use crate::history;
use crate::models::{Cache, Config, HistoryStore};

fn home_dir() -> Result<PathBuf, String> {
    std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(PathBuf::from)
        .ok_or_else(|| "Could not resolve the home directory.".to_string())
}

pub fn config_path() -> Result<PathBuf, String> {
    Ok(home_dir()?
        .join(".config")
        .join("asterism")
        .join("config.json"))
}

pub fn cache_path() -> Result<PathBuf, String> {
    Ok(home_dir()?
        .join(".cache")
        .join("asterism")
        .join("cache.json"))
}

pub fn history_path() -> Result<PathBuf, String> {
    Ok(home_dir()?
        .join(".cache")
        .join("asterism")
        .join("history.json"))
}

fn ensure_parent(path: &PathBuf) -> Result<(), String> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)
            .map_err(|e| format!("Could not create {}: {e}", parent.display()))?;
    }
    Ok(())
}

pub fn load_config() -> Result<Config, String> {
    let path = config_path()?;
    if !path.exists() {
        return Ok(Config::default());
    }
    let raw =
        fs::read_to_string(&path).map_err(|e| format!("Could not read {}: {e}", path.display()))?;
    let mut cfg: Config = serde_json::from_str(&raw)
        .map_err(|e| format!("Invalid config at {}: {e}", path.display()))?;
    if cfg.version == 0 {
        cfg.version = 1;
    }
    cfg.repos.retain(|r| !r.trim().is_empty());
    cfg.repos.sort();
    cfg.repos.dedup();
    Ok(cfg)
}

pub fn save_config(mut cfg: Config) -> Result<Config, String> {
    cfg.version = 1;
    cfg.repos.retain(|r| !r.trim().is_empty());
    cfg.repos.sort();
    cfg.repos.dedup();
    let path = config_path()?;
    ensure_parent(&path)?;
    let body = serde_json::to_string_pretty(&cfg).map_err(|e| e.to_string())?;
    fs::write(&path, body).map_err(|e| format!("Could not write {}: {e}", path.display()))?;
    Ok(cfg)
}

#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct CacheFile {
    fetched_at: u64,
    repos: Vec<crate::models::TrackedRepo>,
}

pub fn load_history() -> Result<HistoryStore, String> {
    let path = history_path()?;
    if !path.exists() {
        return Ok(HistoryStore {
            version: 1,
            repos: Default::default(),
        });
    }
    let raw =
        fs::read_to_string(&path).map_err(|e| format!("Could not read {}: {e}", path.display()))?;
    let mut store: HistoryStore = serde_json::from_str(&raw)
        .map_err(|e| format!("Invalid history at {}: {e}", path.display()))?;
    if store.version == 0 {
        store.version = 1;
    }
    Ok(store)
}

pub fn save_history(store: &HistoryStore) -> Result<(), String> {
    let path = history_path()?;
    ensure_parent(&path)?;
    let body = serde_json::to_string_pretty(store).map_err(|e| e.to_string())?;
    fs::write(&path, body).map_err(|e| format!("Could not write {}: {e}", path.display()))?;
    Ok(())
}

pub fn load_cache() -> Result<Option<Cache>, String> {
    let path = cache_path()?;
    if !path.exists() {
        return Ok(None);
    }
    let raw =
        fs::read_to_string(&path).map_err(|e| format!("Could not read {}: {e}", path.display()))?;
    let file: CacheFile = serde_json::from_str(&raw)
        .map_err(|e| format!("Invalid cache at {}: {e}", path.display()))?;
    let history = load_history()?.repos;
    Ok(Some(Cache {
        fetched_at: file.fetched_at,
        repos: file.repos,
        history,
    }))
}

pub fn save_cache(
    repos: Vec<crate::models::TrackedRepo>,
    history: std::collections::BTreeMap<String, crate::models::RepoHistory>,
) -> Result<Cache, String> {
    let cache = Cache {
        fetched_at: history::now_secs(),
        repos,
        history,
    };
    let file = CacheFile {
        fetched_at: cache.fetched_at,
        repos: cache.repos.clone(),
    };
    let path = cache_path()?;
    ensure_parent(&path)?;
    let body = serde_json::to_string_pretty(&file).map_err(|e| e.to_string())?;
    fs::write(&path, body).map_err(|e| format!("Could not write {}: {e}", path.display()))?;
    Ok(cache)
}
