mod commands;
mod config;
mod gh;
mod history;
mod models;
mod platform;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            commands::get_status,
            commands::get_config,
            commands::save_config,
            commands::save_appearance,
            commands::save_locale,
            commands::get_diagnostics,
            commands::get_cache,
            commands::list_catalog,
            commands::list_create_options,
            commands::create_repo,
            commands::refresh_tracked,
            commands::get_repo_detail
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod locale_tests {
    use super::commands::normalize_locale;
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
