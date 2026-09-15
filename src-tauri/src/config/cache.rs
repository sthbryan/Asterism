//! Per-account, namespaced cache persistence.
//!
//! Entries are stored independently under `accounts/<account>/cache/<namespace>`
//! so updating one view never rewrites the complete cache.

use serde::{de::DeserializeOwned, Deserialize, Serialize};
use serde_json::Value;
use std::{
    collections::BTreeMap,
    fs,
    path::{Path, PathBuf},
};

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
    if value.is_empty()
        || value.len() > max
        || value.chars().any(char::is_control)
        || value == "."
        || value == ".."
        || (label == "namespace" && (value.contains('/') || value.contains('\\')))
    {
        return Err(format!("Invalid cache {label}."));
    }
    Ok(())
}

fn entry_id(namespace: &str, key: &str) -> Result<(), String> {
    validate_part(namespace, MAX_NAMESPACE_LEN, "namespace")?;
    validate_part(key, MAX_KEY_LEN, "key")
}

fn filename(key: &str) -> String {
    let encoded: String = key.bytes().map(|byte| format!("{byte:02x}")).collect();
    format!("{encoded}.json")
}

impl<R: Runtime> Storage<R> {
    pub fn cache_path(&self) -> Result<PathBuf, String> {
        Ok(self
            .root
            .join(account_file(
                &self.account()?.ok_or("No saved account is selected.")?,
                "cache",
            ))
            .with_extension(""))
    }

    fn legacy_cache_path(&self) -> Result<PathBuf, String> {
        Ok(self.root.join(account_file(
            &self.account()?.ok_or("No saved account is selected.")?,
            "cache",
        )))
    }

    fn cache_dir(&self) -> Result<PathBuf, String> {
        Ok(self.cache_path()?.with_file_name("cache"))
    }

    fn entry_path(&self, namespace: &str, key: &str) -> Result<PathBuf, String> {
        entry_id(namespace, key)?;
        Ok(self.cache_dir()?.join(namespace).join(filename(key)))
    }

    fn read_entry_value(&self, path: &Path) -> Result<Option<CacheEntry<Value>>, String> {
        match fs::read(path) {
            Ok(raw) => serde_json::from_slice(&raw)
                .map(Some)
                .map_err(|e| format!("Invalid cache entry {}: {e}", path.display())),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(error) => Err(format!("Could not read {}: {error}", path.display())),
        }
    }

    fn read_legacy_entry(
        &self,
        namespace: &str,
        key: &str,
    ) -> Result<Option<CacheEntry<Value>>, String> {
        let legacy = self.legacy_cache_path()?.display().to_string();
        Ok(self
            .read::<CacheDocument>(&legacy)?
            .and_then(|document| document.entries.get(&format!("{namespace}:{key}")).cloned()))
    }

    fn all_entry_paths(&self) -> Result<Vec<PathBuf>, String> {
        let root = self.cache_dir()?;
        let mut paths = Vec::new();
        let namespaces = match fs::read_dir(&root) {
            Ok(entries) => entries,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(paths),
            Err(error) => return Err(format!("Could not read {}: {error}", root.display())),
        };
        for namespace in namespaces {
            let namespace = namespace.map_err(|e| e.to_string())?;
            if !namespace.file_type().map_err(|e| e.to_string())?.is_dir() {
                continue;
            }
            for entry in fs::read_dir(namespace.path()).map_err(|e| e.to_string())? {
                let entry = entry.map_err(|e| e.to_string())?;
                if entry.file_type().map_err(|e| e.to_string())?.is_file()
                    && entry.path().extension().is_some_and(|ext| ext == "json")
                {
                    paths.push(entry.path());
                }
            }
        }
        Ok(paths)
    }

    pub fn read_cache<T: DeserializeOwned>(
        &self,
        namespace: &str,
        key: &str,
    ) -> Result<Option<CacheEntry<T>>, String> {
        let path = self.entry_path(namespace, key)?;
        let entry = self.read_entry_value(&path)?;
        let entry = match entry {
            Some(entry) => Some(entry),
            None => self.read_legacy_entry(namespace, key)?,
        };
        entry
            .map(|entry| {
                serde_json::from_value(entry.data)
                    .map(|data| CacheEntry {
                        version: entry.version,
                        fetched_at: entry.fetched_at,
                        data,
                        warning: entry.warning,
                    })
                    .map_err(|e| format!("Invalid cache entry {namespace}:{key}: {e}"))
            })
            .transpose()
    }

    pub fn write_cache<T: Serialize>(
        &self,
        namespace: &str,
        key: &str,
        entry: &CacheEntry<T>,
    ) -> Result<(), String> {
        let path = self.entry_path(namespace, key)?;
        let value = serde_json::to_vec(entry)
            .map_err(|e| format!("Could not serialize cache entry {namespace}:{key}: {e}"))?;
        fs::create_dir_all(path.parent().ok_or("Invalid cache path.")?)
            .map_err(|e| e.to_string())?;
        let pending = path.with_extension("pending");
        fs::write(&pending, &value)
            .map_err(|e| format!("Could not write {}: {e}", pending.display()))?;
        fs::File::open(&pending)
            .and_then(|file| file.sync_all())
            .map_err(|e| e.to_string())?;
        fs::rename(&pending, &path).map_err(|e| format!("Could not commit {}: {e}", path.display()))
    }

    pub fn remove_cache(&self, namespace: &str, key: &str) -> Result<bool, String> {
        match fs::remove_file(self.entry_path(namespace, key)?) {
            Ok(()) => Ok(true),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(false),
            Err(error) => Err(error.to_string()),
        }
    }

    pub fn clear_cache(&self, namespace: Option<&str>) -> Result<usize, String> {
        if let Some(namespace) = namespace {
            validate_part(namespace, MAX_NAMESPACE_LEN, "namespace")?;
        }
        let paths = self.all_entry_paths()?;
        let mut removed = 0;
        for path in paths {
            let matches = namespace.is_none()
                || path
                    .parent()
                    .and_then(Path::file_name)
                    .and_then(|name| name.to_str())
                    == namespace;
            if matches && fs::remove_file(path).is_ok() {
                removed += 1;
            }
        }
        if namespace.is_none() && fs::remove_file(self.legacy_cache_path()?).is_ok() {
            removed += 1;
        }
        Ok(removed)
    }

    pub fn cache_info(&self) -> Result<CacheInfo, String> {
        let mut bytes = 0;
        let mut entries = 0;
        for path in self.all_entry_paths()? {
            if let Ok(metadata) = fs::metadata(path) {
                bytes += metadata.len();
                entries += 1;
            }
        }
        if let Ok(metadata) = fs::metadata(self.legacy_cache_path()?) {
            bytes += metadata.len();
        }
        Ok(CacheInfo {
            path: self.cache_dir()?.display().to_string(),
            bytes,
            entries,
        })
    }
}

#[cfg(test)]
mod tests {
    use super::{entry_id, filename};
    #[test]
    fn keys_are_safe_filenames() {
        assert_eq!(filename("owner/name"), "6f776e65722f6e616d65.json");
        assert!(entry_id("detail", "owner/name").is_ok());
        assert!(entry_id("", "repo").is_err());
        assert!(entry_id("../detail", "repo").is_err());
        assert!(entry_id("detail", "repo\n").is_err());
    }
}
