use crate::commands::status::normalize_locale;
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
