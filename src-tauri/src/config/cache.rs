//! Per-account, namespaced cache persistence.
//!
//! Cache entries are deliberately stored as JSON values so the same storage
//! layer can be used by detail, overview, and future views without making the
//! Rust backend depend on their response types.

use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::Value;
use std::{collections::BTreeMap, fs, path::PathBuf};

use super::{account_file, Storage};
use tauri::Runtime;

const MAX_NAMESPACE_LEN: usize = 64;
const MAX_KEY_LEN: usize = 512;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheEntry<T> {
    pub version: u32,
    pub fetched_at: u64,
    pub data: T,
    #[serde(default)]
    pub warning: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CacheInfo {
    pub path: String,
    pub bytes: u64,
    pub entries: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(default)]
struct CacheDocument {
    entries: BTreeMap<String, CacheEntry<Value>>,
}

fn validate_part(value: &str, max: usize, label: &str) -> Result<(), String> {
    if value.is_empty() || value.len() > max || value.chars().any(char::is_control) {
        return Err(format!("Invalid cache {label}."));
    }
    Ok(())
}

fn entry_key(namespace: &str, key: &str) -> Result<String, String> {
    validate_part(namespace, MAX_NAMESPACE_LEN, "namespace")?;
    validate_part(key, MAX_KEY_LEN, "key")?;
    Ok(format!("{namespace}:{key}"))
}

impl<R: Runtime> Storage<R> {
    pub fn cache_path(&self) -> Result<PathBuf, String> {
        Ok(self.root.join(account_file(
            &self.account()?.ok_or("No saved account is selected.")?,
            "cache",
        )))
    }

    fn cache_file(&self) -> Result<String, String> {
        Ok(self.cache_path()?.display().to_string())
    }

    fn load_cache_document(&self) -> Result<CacheDocument, String> {
        Ok(self.read(&self.cache_file()?)?.unwrap_or_default())
    }

    pub fn read_cache<T: DeserializeOwned>(
        &self,
        namespace: &str,
        key: &str,
    ) -> Result<Option<CacheEntry<T>>, String> {
        let id = entry_key(namespace, key)?;
        let document = self.load_cache_document()?;
        document
            .entries
            .get(&id)
            .cloned()
            .map(|entry| {
                serde_json::from_value(entry.data)
                    .map(|data| CacheEntry {
                        version: entry.version,
                        fetched_at: entry.fetched_at,
                        data,
                        warning: entry.warning,
                    })
                    .map_err(|e| format!("Invalid cache entry {id}: {e}"))
            })
            .transpose()
    }

    pub fn write_cache<T: Serialize>(
        &self,
        namespace: &str,
        key: &str,
        entry: &CacheEntry<T>,
    ) -> Result<(), String> {
        let id = entry_key(namespace, key)?;
        let mut document = self.load_cache_document()?;
        let data = serde_json::to_value(&entry.data)
            .map_err(|e| format!("Could not serialize cache entry {id}: {e}"))?;
        document.entries.insert(
            id,
            CacheEntry {
                version: entry.version,
                fetched_at: entry.fetched_at,
                data,
                warning: entry.warning.clone(),
            },
        );
        self.write(&self.cache_file()?, &document)
    }

    pub fn remove_cache(&self, namespace: &str, key: &str) -> Result<bool, String> {
        let id = entry_key(namespace, key)?;
        let mut document = self.load_cache_document()?;
        let removed = document.entries.remove(&id).is_some();
        if removed {
            // Keep the file around rather than adding a destructive file
            // operation to the generic storage layer.
            self.write(&self.cache_file()?, &document)?;
        }
        Ok(removed)
    }

    pub fn clear_cache(&self, namespace: Option<&str>) -> Result<usize, String> {
        if let Some(namespace) = namespace {
            validate_part(namespace, MAX_NAMESPACE_LEN, "namespace")?;
        }
        let mut document = self.load_cache_document()?;
        let before = document.entries.len();
        match namespace {
            Some(prefix) => document
                .entries
                .retain(|id, _| !id.starts_with(&format!("{prefix}:"))),
            None => document.entries.clear(),
        }
        let removed = before - document.entries.len();
        if removed > 0 {
            self.write(&self.cache_file()?, &document)?;
        }
        Ok(removed)
    }

    pub fn cache_info(&self) -> Result<CacheInfo, String> {
        let path = self.cache_path()?;
        let entries = self.load_cache_document()?.entries.len();
        let bytes = fs::metadata(&path)
            .map(|metadata| metadata.len())
            .unwrap_or(0);
        Ok(CacheInfo {
            path: path.display().to_string(),
            bytes,
            entries,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::entry_key;

    #[test]
    fn namespaces_and_keys_are_unambiguous() {
        assert_eq!(
            entry_key("detail", "owner/name").unwrap(),
            "detail:owner/name"
        );
        assert!(entry_key("", "repo").is_err());
        assert!(entry_key("detail", "repo\n").is_err());
    }
}
