use super::Storage;
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

impl<R: Runtime> Storage<R> {
    pub fn config_path(&self) -> PathBuf {
        self.root.join("preferences.json")
    }
    pub fn history_path(&self) -> Result<PathBuf, String> {
        Ok(self.root.join(self.account_file("history")?))
    }
}
