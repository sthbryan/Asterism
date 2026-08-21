mod config;
mod gh;
mod models;

use models::{Cache, CatalogRepo, Config, RepoDetail, Status, TrackedRepo};

#[tauri::command]
fn get_status() -> Status {
    gh::status()
}

#[tauri::command]
fn get_config() -> Result<Config, String> {
    config::load_config()
}

#[tauri::command]
fn save_config(repos: Vec<String>) -> Result<Config, String> {
    config::save_config(Config { version: 1, repos })
}

#[tauri::command]
fn get_cache() -> Result<Option<Cache>, String> {
    config::load_cache()
}

#[tauri::command]
fn list_catalog() -> Result<Vec<CatalogRepo>, String> {
    gh::list_catalog()
}

#[tauri::command]
fn refresh_tracked() -> Result<Cache, String> {
    let cfg = config::load_config()?;
    let repos: Vec<TrackedRepo> = gh::refresh_tracked(cfg.repos);
    config::save_cache(repos)
}

#[tauri::command]
fn get_repo_detail(full_name: String) -> Result<RepoDetail, String> {
    gh::repo_detail(full_name)
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
