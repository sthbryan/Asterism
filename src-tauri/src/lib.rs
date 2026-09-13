mod config;
mod gh;
mod history;
mod models;

use std::collections::HashSet;

use models::{Cache, CatalogRepo, Config, RepoDetail, Status};

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
        let mut store = config::load_history()?;
        let seed_for: HashSet<String> = cfg
            .repos
            .iter()
            .filter(|name| history::needs_star_seed(&store, name))
            .cloned()
            .collect();
        let fetches = gh::refresh_tracked(cfg.repos, seed_for);
        let now = history::now_secs();
        let repos = fetches
            .iter()
            .map(|fetch| {
                history::apply_fetch(&mut store, &fetch.repo, fetch.star_seed.clone(), now);
                fetch.repo.clone()
            })
            .collect();
        config::save_history(&store)?;
        config::save_cache(repos, store.repos)
    })
    .await?
}

#[tauri::command]
async fn get_repo_detail(full_name: String) -> Result<RepoDetail, String> {
    offload(move || {
        let mut detail = gh::repo_detail(full_name.clone())?;
        let mut store = config::load_history()?;
        let now = history::now_secs();
        if history::needs_star_seed(&store, &full_name) && detail.stars > 0 {
            if let Ok(seed) =
                gh::star_series(&full_name, detail.stars, detail.created_at.as_deref())
            {
                store
                    .repos
                    .entry(full_name.clone())
                    .or_default()
                    .stars = seed;
            }
        }
        let snapshot = models::TrackedRepo {
            full_name: detail.full_name.clone(),
            description: detail.description.clone(),
            private: detail.private,
            language: detail.language.clone(),
            stars: detail.stars,
            forks: detail.forks,
            downloads: detail.downloads,
            error: None,
        };
        history::apply_fetch(&mut store, &snapshot, None, now);
        let _ = config::save_history(&store);
        if let Some(entry) = store.repos.get(&full_name) {
            detail.star_history = entry.stars.clone();
            detail.download_history = entry.downloads.clone();
        }
        Ok(detail)
    })
    .await?
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
