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

static CONFIG_LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());

pub fn load_config() -> Result<Config, String> {
    let _guard = CONFIG_LOCK
        .lock()
        .map_err(|_| "Configuration lock failed".to_string())?;
    load_config_at(&config_path()?)
}

fn load_config_at(path: &PathBuf) -> Result<Config, String> {
    if !path.exists() {
        return Ok(Config::default());
    }
    let raw =
        fs::read_to_string(&path).map_err(|e| format!("Could not read {}: {e}", path.display()))?;
    let mut cfg: Config = serde_json::from_str(&raw)
        .map_err(|e| format!("Invalid config at {}: {e}", path.display()))?;
    drop(raw);
    if cfg.version == 0 {
        cfg.version = 1;
    }
    cfg.repos.retain(|r| !r.trim().is_empty());
    cfg.repos.sort();
    cfg.repos.dedup();
    Ok(cfg)
}

// Config updates share one lock so locale, appearance and repository selection
// cannot overwrite each other's fields when commands arrive together.
pub fn update_config(change: impl FnOnce(&mut Config)) -> Result<Config, String> {
    update_config_at(&config_path()?, change)
}

fn update_config_at(path: &PathBuf, change: impl FnOnce(&mut Config)) -> Result<Config, String> {
    let _guard = CONFIG_LOCK
        .lock()
        .map_err(|_| "Configuration lock failed".to_string())?;
    let mut cfg = load_config_at(path)?;
    change(&mut cfg);
    save_config_at(path, cfg)
}

fn save_config_at(path: &PathBuf, mut cfg: Config) -> Result<Config, String> {
    cfg.version = 1;
    cfg.repos.retain(|r| !r.trim().is_empty());
    cfg.repos.sort();
    cfg.repos.dedup();
    ensure_parent(path)?;
    let body = serde_json::to_string_pretty(&cfg).map_err(|e| e.to_string())?;
    fs::write(&path, body).map_err(|e| format!("Could not write {}: {e}", path.display()))?;
    Ok(cfg)
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct CacheFile<'a> {
    fetched_at: u64,
    repos: &'a [crate::models::TrackedRepo],
}

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
struct CacheFileOwned {
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
    drop(raw);
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
    let file: CacheFileOwned = serde_json::from_str(&raw)
        .map_err(|e| format!("Invalid cache at {}: {e}", path.display()))?;
    drop(raw);
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
        repos: &cache.repos,
    };
    let path = cache_path()?;
    ensure_parent(&path)?;
    let body = serde_json::to_string_pretty(&file).map_err(|e| e.to_string())?;
    fs::write(&path, body).map_err(|e| format!("Could not write {}: {e}", path.display()))?;
    Ok(cache)
}

#[cfg(test)]
mod preference_tests {
    use super::*;
    use crate::models::{Locale, ThemePref};

    #[test]
    fn concurrent_updates_preserve_existing_preferences_after_reload() {
        let dir = std::env::temp_dir().join(format!(
            "asterism-preferences-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_nanos()
        ));
        fs::create_dir_all(&dir).unwrap();
        let path = dir.join("config.json");
        fs::write(
            &path,
            r#"{"version":1,"repos":["owner/repo"],"theme":"light","transparency":true}"#,
        )
        .unwrap();
        let barrier = std::sync::Arc::new(std::sync::Barrier::new(3));
        let workers: Vec<_> = (0..3)
            .map(|n| {
                let path = path.clone();
                let barrier = barrier.clone();
                std::thread::spawn(move || {
                    barrier.wait();
                    update_config_at(&path, |cfg| match n {
                        0 => cfg.locale = Some(Locale::Es),
                        1 => cfg.theme = ThemePref::System,
                        _ => cfg.repos.push("owner/another".into()),
                    })
                    .unwrap();
                })
            })
            .collect();
        for worker in workers {
            worker.join().unwrap();
        }
        let saved = load_config_at(&path).unwrap();
        assert_eq!(saved.locale, Some(Locale::Es));
        assert_eq!(saved.theme, ThemePref::System);
        assert!(saved.transparency);
        assert_eq!(saved.repos, vec!["owner/another", "owner/repo"]);
        fs::write(&path, "invalid JSON").unwrap();
        assert!(update_config_at(&path, |cfg| cfg.locale = Some(Locale::En)).is_err());
        assert_eq!(fs::read_to_string(&path).unwrap(), "invalid JSON");
        fs::remove_dir_all(dir).unwrap();
    }
}
