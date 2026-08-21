mod config;
mod gh;
mod models;

use models::{Cache, CatalogRepo, Config, RepoDetail, Status, TrackedRepo};

async fn offload<T, F>(f: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> T + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(f)
        .await
        .map_err(|e| format!("background task failed: {e}"))
}

#[tauri::command]
async fn get_status() -> Result<Status, String> {
    offload(gh::status).await
}

#[tauri::command]
async fn get_config() -> Result<Config, String> {
    offload(config::load_config).await?
}

#[tauri::command]
async fn save_config(repos: Vec<String>) -> Result<Config, String> {
    offload(move || config::save_config(Config { version: 1, repos })).await?
}

#[tauri::command]
async fn get_cache() -> Result<Option<Cache>, String> {
    offload(config::load_cache).await?
}

#[tauri::command]
async fn list_catalog() -> Result<Vec<CatalogRepo>, String> {
    offload(gh::list_catalog).await?
}

#[tauri::command]
async fn refresh_tracked() -> Result<Cache, String> {
    offload(|| {
        let cfg = config::load_config()?;
        let repos: Vec<TrackedRepo> = gh::refresh_tracked(cfg.repos);
        config::save_cache(repos)
    })
    .await?
}

#[tauri::command]
async fn get_repo_detail(full_name: String) -> Result<RepoDetail, String> {
    offload(move || gh::repo_detail(full_name)).await?
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_status,
            get_config,
            save_config,
            get_cache,
            list_catalog,
            refresh_tracked,
            get_repo_detail
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
