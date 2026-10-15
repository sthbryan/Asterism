use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, OnceLock};

pub async fn read_only<T, F>(f: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(f)
        .await
        .map_err(|e| format!("background task failed: {e}"))?
}

static SLOTS: OnceLock<Mutex<HashMap<PathBuf, Arc<Mutex<()>>>>> = OnceLock::new();

fn slot_for(dir: &Path) -> Arc<Mutex<()>> {
    let key = dir.canonicalize().unwrap_or_else(|_| dir.to_path_buf());
    let map = SLOTS.get_or_init(|| Mutex::new(HashMap::new()));
    let mut guard = map.lock().unwrap_or_else(|e| e.into_inner());
    guard
        .entry(key)
        .or_insert_with(|| Arc::new(Mutex::new(())))
        .clone()
}

// Called inside read_only: canonicalization and lock waits must stay off the executor.
pub fn serialized_on<T>(dir: &Path, f: impl FnOnce() -> Result<T, String>) -> Result<T, String> {
    let slot = slot_for(dir);
    let _guard = slot.lock().unwrap_or_else(|e| e.into_inner());
    f()
}
