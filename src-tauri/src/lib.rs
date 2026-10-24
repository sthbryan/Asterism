mod commands;
mod config;
mod gh;
mod git;
mod history;
mod models;
mod platform;
mod pulls;

use std::time::Duration;
use tauri::Manager;

/// The window is created hidden so its first frame is content, not an empty
/// plate. React reveals it once the first view is committed; this is the
/// backstop for a frontend that never gets that far.
const REVEAL_FALLBACK: Duration = Duration::from_secs(3);

#[tauri::command]
fn show_main_window(app: tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn reveal_main_window(app: tauri::AppHandle, after: Duration) {
    std::thread::spawn(move || {
        std::thread::sleep(after);
        if let Some(window) = app.get_webview_window("main") {
            if !window.is_visible().unwrap_or(true) {
                let _ = window.show();
                let _ = window.set_focus();
            }
        }
    });
}

#[cfg(test)]
mod git_sync_tests;
#[cfg(test)]
mod local_projects_tests;
#[cfg(test)]
mod locale_tests;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .setup(|app| {
            config::init(app.handle().clone());
            reveal_main_window(app.handle().clone(), REVEAL_FALLBACK);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            show_main_window,
            commands::cache::read_cache,
            commands::cache::write_cache,
            commands::cache::remove_cache,
            commands::cache::clear_cache,
            commands::cache::get_cache_info,
            commands::state::get_local_state,
            commands::state::use_legacy_data,
            commands::state::import_legacy_data,
            commands::status::get_status,
            commands::status::get_config,
            commands::status::save_config,
            commands::status::save_appearance,
            commands::status::save_locale,
            commands::status::get_diagnostics,
            commands::catalog::list_catalog,
            commands::catalog::list_create_options,
            commands::catalog::create_repo,
            commands::catalog::refresh_tracked,
            commands::catalog::get_repo_detail,
            commands::local::list_local_checkouts,
            commands::local::link_local_checkout,
            commands::local::unlink_local_checkout,
            commands::local::clone_local_repository,
            commands::local::open_local_checkout,
            git::commands::git_sync_status,
            git::commands::git_fetch,
            git::commands::git_pull,
            git::commands::git_push,
            git::commands::git_switch_branch,
            git::commands::git_create_branch,
            commands::pulls_cmds::refresh_pull_requests,
            commands::pulls_cmds::load_more_pull_requests,
            commands::pulls_cmds::list_pull_requests,
            commands::pulls_cmds::list_pull_requests_filtered,
            commands::pulls_cmds::get_pull_request_detail,
            commands::pulls_cmds::get_pull_request,
            commands::pulls_cmds::get_pull_request_diff,
            commands::pulls_cmds::get_pull_diff
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
