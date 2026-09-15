use crate::config;
use crate::gh;
use crate::models::{Config, Diagnostics, Locale, Status, ThemePref};

use super::catalog::account_key;
use super::state::ensure_scope;

pub(crate) async fn offload<T, F>(f: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> T + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(f)
        .await
        .map_err(|e| format!("background task failed: {e}"))
}

pub(crate) async fn offload_unlocked<T, F>(f: F) -> Result<T, String>
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
    offload(|| {
        let status = gh::status();
        gh::remember_status(&status);
        if status.ok {
            config::storage()?.activate(account_key(&status)?)?;
        }
        Ok(status)
    })
    .await?
}

#[tauri::command]
pub(crate) async fn get_config() -> Result<Config, String> {
    offload(|| config::storage()?.load_config()).await?
}

#[tauri::command]
pub(crate) async fn save_config(
    repos: Vec<String>,
    expected_account: Option<String>,
) -> Result<Config, String> {
    offload(move || {
        ensure_scope(expected_account.as_deref())?;
        config::storage()?.save_repos(repos)
    })
    .await?
}

#[tauri::command]
pub(crate) async fn save_appearance(theme: String, transparency: bool) -> Result<Config, String> {
    offload(move || {
        config::storage()?.save_appearance(
            match theme.as_str() {
                "light" => ThemePref::Light,
                "system" => ThemePref::System,
                _ => ThemePref::Dark,
            },
            transparency,
        )
    })
    .await?
}

pub(crate) fn normalize_locale(raw: &str) -> Locale {
    match raw.trim().to_lowercase().as_str() {
        "es" => Locale::Es,
        _ => Locale::En,
    }
}

#[tauri::command]
pub(crate) async fn save_locale(locale: String) -> Result<Config, String> {
    offload(move || config::storage()?.save_locale(normalize_locale(&locale))).await?
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
            config_path: config::storage()
                .map(|db| db.config_path())
                .map(|p| p.display().to_string())
                .unwrap_or_default(),
            history_path: config::storage()
                .and_then(|db| db.history_path())
                .map(|p| p.display().to_string())
                .unwrap_or_default(),
        })
    })
    .await?
}
