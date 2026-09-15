use super::*;
use crate::models::*;
use std::fs;
fn fixture() -> (
    tauri::App<tauri::test::MockRuntime>,
    Storage<tauri::test::MockRuntime>,
) {
    let app = tauri::test::mock_builder()
        .plugin(tauri_plugin_store::Builder::default().build())
        .build(tauri::test::mock_context(tauri::test::noop_assets()))
        .unwrap();
    static NEXT: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
    let root = std::env::temp_dir().join(format!(
        "asterism-store-{}-{}-{}",
        NEXT.fetch_add(1, std::sync::atomic::Ordering::Relaxed),
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    ));
    let db = Storage {
        app: app.handle().clone(),
        home: root.join("home"),
        root: root.join("data"),
    };
    (app, db)
}
fn legacy(db: &Storage<tauri::test::MockRuntime>) {
    let path = db.home.join(".config/asterism/config.json");
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(
        path,
        r#"{"version":1,"repos":["owner/repo"],"theme":"light","transparency":true,"locale":"es"}"#,
    )
    .unwrap();
}
#[test]
fn migration_is_repeatable_preserves_originals_and_requires_account_assignment() {
    let (_app, db) = fixture();
    legacy(&db);
    let original = fs::read(db.home.join(".config/asterism/config.json")).unwrap();
    db.migrate().unwrap();
    db.migrate().unwrap();
    let state = db.local_state().unwrap();
    assert!(state.account.is_none());
    assert!(state.config.repos.is_empty());
    assert!(state.legacy_available);
    assert_eq!(state.config.locale, Some(Locale::Es));
    assert!(state.config.transparency);
    db.activate("github.com/one".into()).unwrap();
    db.import_legacy().unwrap();
    db.import_legacy().unwrap();
    assert_eq!(db.load_config().unwrap().repos, vec!["owner/repo"]);
    assert!(!db.local_state().unwrap().legacy_available);
    assert_eq!(
        fs::read(db.home.join(".config/asterism/config.json")).unwrap(),
        original
    );
    db.save_locale(Locale::En).unwrap();
    db.migrate().unwrap();
    assert_eq!(db.load_config().unwrap().locale, Some(Locale::En));
    fs::remove_dir_all(db.root.parent().unwrap()).unwrap();
}
#[test]
fn malformed_legacy_aborts_before_any_store_write() {
    let (_app, db) = fixture();
    legacy(&db);
    let path = db.home.join(".cache/asterism/history.json");
    fs::create_dir_all(path.parent().unwrap()).unwrap();
    fs::write(&path, "broken").unwrap();
    assert!(db.migrate().is_err());
    assert!(!db.root.exists());
    assert_eq!(fs::read_to_string(path).unwrap(), "broken");
    fs::remove_dir_all(db.home.parent().unwrap()).unwrap();
}
#[test]
fn explicit_saves_reload_preserves_preferences_projects_and_history() {
    let (_app, db) = fixture();
    db.activate("github.com/one".into()).unwrap();
    db.save_repos(vec!["one/private".into()]).unwrap();
    db.save_locale(Locale::Es).unwrap();
    db.save_appearance(ThemePref::System, true).unwrap();
    let mut projects = db.projects().unwrap();
    projects
        .folders
        .insert("one/private".into(), vec!["/my projects/repo".into()]);
    db.write(&db.account_file("projects").unwrap(), &projects)
        .unwrap();
    let mut hist = HistoryStore::default();
    hist.repos
        .insert("one/private".into(), RepoHistory::default());
    db.save_history(&hist).unwrap();
    assert_eq!(db.load_config().unwrap().repos, vec!["one/private"]);
    assert_eq!(db.load_config().unwrap().locale, Some(Locale::Es));
    assert!(db.load_config().unwrap().transparency);
    assert_eq!(
        db.projects().unwrap().folders["one/private"],
        vec!["/my projects/repo"]
    );
    assert!(db.load_history().unwrap().repos.contains_key("one/private"));
    db.activate("enterprise.example/one".into()).unwrap();
    assert!(db.load_config().unwrap().repos.is_empty());
    db.activate("github.com/two".into()).unwrap();
    assert!(db.load_history().unwrap().repos.is_empty());
    db.activate("github.com/one".into()).unwrap();
    assert_eq!(db.load_config().unwrap().repos, vec!["one/private"]);
    fs::remove_dir_all(db.root.parent().unwrap()).unwrap();
}
#[test]
fn corrupt_future_and_failed_writes_preserve_previous_document() {
    let (_app, db) = fixture();
    db.activate("github.com/one".into()).unwrap();
    let path = db.root.join("preferences.json");
    let previous = fs::read(&path).unwrap();
    fs::create_dir(path.with_extension("pending")).unwrap();
    assert!(db.save_locale(Locale::Es).is_err());
    assert_eq!(fs::read(&path).unwrap(), previous);
    fs::remove_dir(path.with_extension("pending")).unwrap();
    fs::write(&path, r#"{"document":{"version":999,"data":{}}}"#).unwrap();
    assert!(db.save_locale(Locale::Es).is_err());
    assert!(fs::read_to_string(&path).unwrap().contains("999"));
    fs::write(&path, "corrupt").unwrap();
    assert!(db.load_config().is_err());
    assert!(db.save_locale(Locale::En).is_err());
    assert_eq!(fs::read_to_string(path).unwrap(), "corrupt");
    fs::remove_dir_all(db.root.parent().unwrap()).unwrap();
}
#[test]
fn bounded_history_keeps_durable_data() {
    let (_app, db) = fixture();
    db.activate("github.com/one".into()).unwrap();
    let mut hist = HistoryStore::default();
    for i in 0..501 {
        hist.repos.insert(
            format!("one/{i}"),
            RepoHistory {
                downloads: (0..200).map(|ts| SeriesPoint { ts, value: ts }).collect(),
                ..Default::default()
            },
        );
    }
    db.save_history(&hist).unwrap();
    let saved = db.load_history().unwrap();
    assert_eq!(saved.repos.len(), 500);
    assert!(saved
        .repos
        .values()
        .all(|s| s.downloads.len() == 180 && s.downloads[0].ts == 20));
    fs::remove_dir_all(db.root.parent().unwrap()).unwrap();
}
#[test]
fn concurrent_preference_and_project_updates_preserve_each_other() {
    let (_app, db) = fixture();
    db.activate("github.com/one".into()).unwrap();
    let barrier = std::sync::Arc::new(std::sync::Barrier::new(3));
    let workers: Vec<_> = (0..3)
        .map(|i| {
            let db = Storage {
                app: db.app.clone(),
                root: db.root.clone(),
                home: db.home.clone(),
            };
            let barrier = barrier.clone();
            std::thread::spawn(move || {
                barrier.wait();
                serialized_write(|| match i {
                    0 => db.save_locale(Locale::Es),
                    1 => db.save_appearance(ThemePref::System, true),
                    _ => db.save_repos(vec!["one/repo".into()]),
                })
                .unwrap();
            })
        })
        .collect();
    for worker in workers {
        worker.join().unwrap();
    }
    let cfg = db.load_config().unwrap();
    assert_eq!(cfg.locale, Some(Locale::Es));
    assert_eq!(cfg.theme, ThemePref::System);
    assert!(cfg.transparency);
    assert_eq!(cfg.repos, vec!["one/repo"]);
    fs::remove_dir_all(db.root.parent().unwrap()).unwrap();
}
