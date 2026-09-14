use std::collections::{HashMap, HashSet};

use crate::config;
use crate::gh;
use crate::history;
use crate::models::{
    Cache, CatalogRepo, Config, CreateOptions, CreateRepoInput, CreatedRepo, Diagnostics, Locale,
    RepoDetail, Status, ThemePref, TrackedRepo,
};

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
pub(crate) async fn get_status() -> Result<Status, String> {
    offload(gh::status).await
}

#[tauri::command]
pub(crate) async fn get_config() -> Result<Config, String> {
    offload(config::load_config).await?
}

#[tauri::command]
pub(crate) async fn save_config(repos: Vec<String>) -> Result<Config, String> {
    offload(move || config::update_config(|cfg| cfg.repos = repos)).await?
}

#[tauri::command]
pub(crate) async fn save_appearance(theme: String, transparency: bool) -> Result<Config, String> {
    offload(move || {
        config::update_config(|cfg| {
            cfg.theme = match theme.as_str() {
                "light" => ThemePref::Light,
                "system" => ThemePref::System,
                _ => ThemePref::Dark,
            };
            cfg.transparency = transparency;
        })
    })
    .await?
}

#[tauri::command]
pub(crate) async fn get_cache() -> Result<Option<Cache>, String> {
    offload(config::load_cache).await?
}

pub(crate) fn normalize_locale(raw: &str) -> Locale {
    match raw.trim().to_lowercase().as_str() {
        "es" => Locale::Es,
        _ => Locale::En,
    }
}

#[tauri::command]
pub(crate) async fn save_locale(locale: String) -> Result<Config, String> {
    offload(move || config::update_config(|cfg| cfg.locale = Some(normalize_locale(&locale))))
        .await?
}

#[tauri::command]
pub(crate) async fn get_diagnostics() -> Result<Diagnostics, String> {
    offload(|| {
        let (gh_version, gh_error) = gh::tool_version("gh", &["--version"]);
        let (git_version, git_error) = gh::tool_version("git", &["--version"]);
        Ok(Diagnostics {
            gh_version,
            gh_error,
            git_version,
            git_error,
            config_path: config::config_path()
                .map(|p| p.display().to_string())
                .unwrap_or_default(),
            cache_path: config::cache_path()
                .map(|p| p.display().to_string())
                .unwrap_or_default(),
            history_path: config::history_path()
                .map(|p| p.display().to_string())
                .unwrap_or_default(),
        })
    })
    .await?
}

#[tauri::command]
pub(crate) async fn list_catalog() -> Result<Vec<CatalogRepo>, String> {
    offload(gh::list_catalog).await?
}

#[tauri::command]
pub(crate) async fn refresh_tracked() -> Result<Cache, String> {
    offload(|| {
        let cfg = config::load_config()?;
        let mut store = config::load_history()?;
        let seed_for: HashSet<String> = cfg
            .repos
            .iter()
            .filter(|name| history::needs_star_seed(&store, name))
            .cloned()
            .collect();
        let previous = config::load_cache().ok().flatten();
        let prev: HashMap<String, TrackedRepo> = previous
            .map(|cache| {
                cache
                    .repos
                    .into_iter()
                    .map(|repo| (repo.full_name.clone(), repo))
                    .collect()
            })
            .unwrap_or_default();
        let fetches = gh::refresh_tracked(cfg.repos, seed_for);
        let now = history::now_secs();
        let repos = fetches
            .into_iter()
            .map(|fetch| {
                history::apply_fetch(&mut store, &fetch.repo, fetch.star_seed, now);
                let mut repo = fetch.repo;
                if let Some(old) = prev.get(&repo.full_name) {
                    repo.stars_delta = Some(repo.stars as i64 - old.stars as i64);
                    repo.forks_delta = Some(repo.forks as i64 - old.forks as i64);
                    repo.downloads_delta = Some(repo.downloads as i64 - old.downloads as i64);
                }
                repo
            })
            .collect();
        config::save_history(&store)?;
        config::save_cache(repos, store.repos)
    })
    .await?
}

#[tauri::command]
pub(crate) async fn list_create_options() -> Result<CreateOptions, String> {
    offload(gh::list_create_options).await?
}

#[tauri::command]
pub(crate) async fn create_repo(input: CreateRepoInput) -> Result<CreatedRepo, String> {
    offload(move || gh::create_repo(input)).await?
}

#[tauri::command]
pub(crate) async fn get_repo_detail(full_name: String) -> Result<RepoDetail, String> {
    offload(move || {
        let mut detail = gh::repo_detail(full_name.clone())?;
        let mut store = config::load_history()?;
        let now = history::now_secs();
        if history::needs_star_seed(&store, &full_name) && detail.stars > 0 {
            if let Ok(seed) =
                gh::star_series(&full_name, detail.stars, detail.created_at.as_deref())
            {
                store.repos.entry(full_name.clone()).or_default().stars = seed;
            }
        }
        let snapshot = TrackedRepo {
            full_name: detail.full_name.clone(),
            description: detail.description.clone(),
            private: detail.private,
            language: detail.language.clone(),
            stars: detail.stars,
            forks: detail.forks,
            downloads: detail.downloads,
            platforms: detail.platforms.clone(),
            stars_delta: None,
            forks_delta: None,
            downloads_delta: None,
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
