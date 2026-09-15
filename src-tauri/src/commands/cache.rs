use crate::config::{self, CacheEntry, CacheInfo};

use super::state::ensure_scope;
use super::status::offload_unlocked;

#[derive(serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CacheWrite {
    pub namespace: String,
    pub key: String,
    pub version: u32,
    pub fetched_at: u64,
    pub data: serde_json::Value,
    #[serde(default)]
    pub warning: Option<String>,
}

#[tauri::command]
pub(crate) async fn read_cache(
    namespace: String,
    key: String,
    expected_account: Option<String>,
) -> Result<Option<CacheEntry<serde_json::Value>>, String> {
    offload_unlocked(move || {
        ensure_scope(expected_account.as_deref())?;
        config::storage()?.read_cache(&namespace, &key)
    })
    .await?
}

#[tauri::command]
pub(crate) async fn write_cache(
    entry: CacheWrite,
    expected_account: Option<String>,
) -> Result<(), String> {
    offload_unlocked(move || {
        ensure_scope(expected_account.as_deref())?;
        let cache = CacheEntry {
            version: entry.version,
            fetched_at: entry.fetched_at,
            data: entry.data,
            warning: entry.warning,
        };
        config::serialized_write(move || {
            config::storage()?.write_cache(&entry.namespace, &entry.key, &cache)
        })
    })
    .await?
}

#[tauri::command]
pub(crate) async fn remove_cache(
    namespace: String,
    key: String,
    expected_account: Option<String>,
) -> Result<bool, String> {
    offload_unlocked(move || {
        ensure_scope(expected_account.as_deref())?;
        config::serialized_write(move || config::storage()?.remove_cache(&namespace, &key))
    })
    .await?
}

#[tauri::command]
pub(crate) async fn clear_cache(
    namespace: Option<String>,
    expected_account: Option<String>,
) -> Result<usize, String> {
    offload_unlocked(move || {
        ensure_scope(expected_account.as_deref())?;
        config::serialized_write(move || config::storage()?.clear_cache(namespace.as_deref()))
    })
    .await?
}

#[tauri::command]
pub(crate) async fn get_cache_info(expected_account: Option<String>) -> Result<CacheInfo, String> {
    offload_unlocked(move || {
        ensure_scope(expected_account.as_deref())?;
        config::storage()?.cache_info()
    })
    .await?
}
