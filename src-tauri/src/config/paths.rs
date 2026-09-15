use super::{
    AccountCache, Storage, MAX_CACHE_BYTES, MAX_DETAILS,
};
pub(crate) use crate::models::pull_detail_key;
use serde::de::DeserializeOwned;
use std::{
    fs,
    path::{Path, PathBuf},
};
use tauri::Runtime;

pub(crate) fn account_file(account: &str, kind: &str) -> String {
    let encoded: String = account.bytes().map(|b| format!("{b:02x}")).collect();
    format!("accounts/{encoded}/{kind}.json")
}

pub(crate) fn legacy_read<T: DeserializeOwned>(path: &Path) -> Result<Option<T>, String> {
    match fs::read(path) {
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(format!("Could not read {}: {e}", path.display())),
        Ok(raw) => serde_json::from_slice(&raw)
            .map(Some)
            .map_err(|e| format!("Invalid legacy data {}: {e}", path.display())),
    }
}

pub(crate) fn bound_cache(cache: &mut AccountCache) -> Result<(), String> {
    const MAX_PULL_DETAILS: usize = 200;
    const MAX_PULL_DIFFS: usize = 40;
    while cache.details.len() > MAX_DETAILS
        || cache.pull_details.len() > MAX_PULL_DETAILS
        || cache.pull_diffs.len() > MAX_PULL_DIFFS
        || serde_json::to_vec(cache).map_err(|e| e.to_string())?.len() > MAX_CACHE_BYTES
    {
        if cache.pull_diffs.len() > MAX_PULL_DIFFS {
            if let Some(key) = cache
                .pull_diffs
                .iter()
                .min_by_key(|(_, v)| v.fetched_at)
                .map(|(k, _)| k.clone())
            {
                cache.pull_diffs.remove(&key);
                continue;
            }
        }
        if cache.pull_details.len() > MAX_PULL_DETAILS {
            if let Some(key) = cache
                .pull_details
                .iter()
                .min_by_key(|(_, v)| v.fetched_at)
                .map(|(k, _)| k.clone())
            {
                cache.pull_details.remove(&key);
                continue;
            }
        }
        if let Some(key) = cache
            .details
            .iter()
            .min_by_key(|(_, v)| v.fetched_at)
            .map(|(k, _)| k.clone())
        {
            cache.details.remove(&key);
        } else {
            return Err("Cache exceeds 16 MiB. Previous saved data was kept.".into());
        }
    }
    Ok(())
}

impl<R: Runtime> Storage<R> {
    pub fn config_path(&self) -> PathBuf {
        self.root.join("preferences.json")
    }
    pub fn cache_path(&self) -> Result<PathBuf, String> {
        Ok(self.root.join(self.account_file("cache")?))
    }
    pub fn history_path(&self) -> Result<PathBuf, String> {
        Ok(self.root.join(self.account_file("history")?))
    }
}
