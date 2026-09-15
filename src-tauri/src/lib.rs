mod commands;
mod config;
mod gh;
mod git;
mod history;
mod models;
mod platform;
mod pulls;

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
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
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
