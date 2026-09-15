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
            commands::state::clear_local_cache,
            commands::status::get_status,
            commands::status::get_config,
            commands::status::save_config,
            commands::status::save_appearance,
            commands::status::save_locale,
            commands::status::get_diagnostics,
            commands::status::get_cache,
            commands::catalog::list_catalog,
            commands::catalog::list_create_options,
            commands::catalog::create_repo,
            commands::catalog::refresh_tracked,
            commands::catalog::get_repo_detail,
            commands::catalog::get_cached_detail,
            commands::local::list_local_checkouts,
            commands::local::link_local_checkout,
            commands::local::unlink_local_checkout,
            commands::local::clone_local_repository,
            commands::local::open_local_checkout,
            git::git_sync_status,
            git::git_fetch,
            git::git_pull,
            git::git_push,
            git::git_switch_branch,
            git::git_create_branch,
            commands::pulls_cmds::get_cached_pull_requests,
            commands::pulls_cmds::refresh_pull_requests,
            commands::pulls_cmds::list_pull_requests,
            commands::pulls_cmds::list_pull_requests_filtered,
            commands::pulls_cmds::get_cached_pull_request_detail,
            commands::pulls_cmds::get_pull_request_detail,
            commands::pulls_cmds::get_pull_request,
            commands::pulls_cmds::get_cached_pull_request_diff,
            commands::pulls_cmds::get_pull_request_diff,
            commands::pulls_cmds::get_pull_diff
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod locale_tests {
    use super::commands::status::normalize_locale;
    use crate::models::{Config, Locale};

    #[test]
    fn unknown_locales_fall_back_to_english() {
        assert_eq!(normalize_locale("es"), Locale::Es);
        assert_eq!(normalize_locale(" es "), Locale::Es);
        assert_eq!(normalize_locale("ES"), Locale::Es);
        assert_eq!(normalize_locale("en"), Locale::En);
        assert_eq!(normalize_locale("fr"), Locale::En);
        assert_eq!(normalize_locale(""), Locale::En);
    }

    #[test]
    fn legacy_configs_without_locale_still_parse() {
        let cfg: Config = serde_json::from_str(
            r#"{"version":1,"repos":["a/b"],"theme":"dark","transparency":false}"#,
        )
        .unwrap();
        assert_eq!(cfg.locale, None);
        let cfg: Config =
            serde_json::from_str(r#"{"version":1,"repos":[],"locale":"es"}"#).unwrap();
        assert_eq!(cfg.locale, Some(Locale::Es));
        let cfg: Config =
            serde_json::from_str(r#"{"version":1,"repos":[],"locale":"en"}"#).unwrap();
        assert_eq!(cfg.locale, Some(Locale::En));
    }
}
