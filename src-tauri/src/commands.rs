use std::collections::{HashMap, HashSet};
use std::path::Path;
use std::process::Command;

use crate::config;
use crate::gh;
use crate::history;
use crate::models::{
    Cache, CatalogRepo, Config, CreateOptions, CreateRepoInput, CreatedRepo, Diagnostics,
    LocalCheckout, Locale, RepoDetail, Status, ThemePref, TrackedRepo, Traffic, TrafficStatus,
};

pub(crate) fn checkout_probe(full: &str, path: &str) -> LocalCheckout {
    let p = Path::new(path);
    let mut out = LocalCheckout {
        full_name: full.into(),
        path: path.into(),
        status: "missing".into(),
        branch: None,
        remote_url: None,
    };
    if !p.exists() {
        return out;
    }
    let run = |args: &[&str]| Command::new("git").args(["-C", path]).args(args).output();
    let top = run(&["rev-parse", "--show-toplevel"]);
    if let Err(error) = &top {
        out.status = if error.kind() == std::io::ErrorKind::NotFound {
            "gitUnavailable"
        } else {
            "notGit"
        }
        .into();
        return out;
    }
    if !top.as_ref().unwrap().status.success() {
        out.status = "notGit".into();
        return out;
    }
    let br = run(&["branch", "--show-current"])
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty());
    let remotes = run(&["remote"])
        .ok()
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .unwrap_or_default();
    let remote = remotes.lines().find_map(|name| {
        run(&["remote", "get-url", name.trim()])
            .ok()
            .and_then(|o| String::from_utf8(o.stdout).ok())
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .filter(|url| remote_matches(full, url))
    });
    out.branch = br;
    out.remote_url = remote.clone();
    out.status = if remote.is_some() {
        "ready".into()
    } else {
        "remoteMismatch".into()
    };
    out
}

pub(crate) fn validate_link(full: &str, path: &str) -> Result<LocalCheckout, String> {
    let p = Path::new(path);
    if !p.is_absolute() {
        return Err("LOCAL_INVALID_PATH".into());
    }
    let canonical = p
        .canonicalize()
        .map_err(|_| "LOCAL_INVALID_PATH".to_string())?;
    let c = checkout_probe(full, canonical.to_str().ok_or("LOCAL_INVALID_PATH")?);
    if c.status != "ready" {
        return Err(match c.status.as_str() {
            "gitUnavailable" => "LOCAL_GIT_UNAVAILABLE",
            "notGit" => "LOCAL_NOT_GIT",
            "missing" => "LOCAL_INVALID_PATH",
            _ => "LOCAL_REMOTE_MISMATCH",
        }
        .into());
    }
    let top = Command::new("git")
        .args([
            "-C",
            canonical.to_str().unwrap(),
            "rev-parse",
            "--show-toplevel",
        ])
        .output()
        .map_err(|_| "LOCAL_GIT_UNAVAILABLE")?;
    let root = Path::new(String::from_utf8_lossy(&top.stdout).trim())
        .canonicalize()
        .map_err(|_| "LOCAL_NOT_GIT")?;
    if root != canonical {
        return Err("LOCAL_CHECKOUT_SUBDIRECTORY".into());
    }
    let mut result = c;
    result.path = canonical.to_string_lossy().into_owned();
    Ok(result)
}

pub(crate) fn remove_checkout_registration(
    folders: &mut std::collections::BTreeMap<String, Vec<String>>,
    full_name: &str,
    path: &str,
) {
    if let Some(paths) = folders.get_mut(full_name) {
        paths.retain(|candidate| candidate != path);
    }
}

pub(crate) fn remote_matches(full: &str, remote: &str) -> bool {
    let value = remote
        .trim()
        .trim_end_matches('/')
        .trim_end_matches(".git")
        .to_ascii_lowercase();
    let full = full.to_ascii_lowercase();
    let host = gh::host();
    value == format!("https://{host}/{full}")
        || value == format!("http://{host}/{full}")
        || value == format!("git@{host}:{full}")
        || value == format!("ssh://git@{host}/{full}")
        || value == format!("{host}/{full}")
}

pub(crate) fn canonical_parent(path: &str) -> Result<std::path::PathBuf, String> {
    let p = Path::new(path);
    if !p.is_absolute() {
        return Err("LOCAL_INVALID_PATH".into());
    }
    let meta = std::fs::symlink_metadata(p).map_err(|_| "LOCAL_INVALID_PATH".to_string())?;
    if !meta.is_dir() || meta.file_type().is_symlink() {
        return Err("LOCAL_INVALID_PATH".into());
    }
    p.canonicalize().map_err(|_| "LOCAL_INVALID_PATH".into())
}

#[tauri::command]
pub(crate) async fn list_local_checkouts(
    expected_account: Option<String>,
) -> Result<Vec<LocalCheckout>, String> {
    offload(move || {
        ensure_scope(expected_account.as_deref())?;
        let s = config::storage()?;
        let f = s.checkout_folders()?;
        Ok(f.into_iter()
            .flat_map(|(n, ps)| ps.into_iter().map(move |p| checkout_probe(&n, &p)))
            .collect())
    })
    .await?
}

#[tauri::command]
pub(crate) async fn link_local_checkout(
    full_name: String,
    path: String,
    expected_account: Option<String>,
) -> Result<LocalCheckout, String> {
    offload(move || {
        ensure_scope(expected_account.as_deref())?;
        let c = validate_link(&full_name, &path)?;
        let s = config::storage()?;
        let mut f = s.checkout_folders()?;
        let e = f.entry(full_name.clone()).or_default();
        if !e.contains(&c.path) {
            e.push(c.path.clone())
        }
        s.save_checkout_folders(f)?;
        Ok(c)
    })
    .await?
}

#[tauri::command]
pub(crate) async fn unlink_local_checkout(
    full_name: String,
    path: String,
    expected_account: Option<String>,
) -> Result<(), String> {
    offload(move || {
        ensure_scope(expected_account.as_deref())?;
        let s = config::storage()?;
        let mut f = s.checkout_folders()?;
        remove_checkout_registration(&mut f, &full_name, &path);
        s.save_checkout_folders(f)
    })
    .await?
}

#[tauri::command]
pub(crate) async fn clone_local_repository(
    full_name: String,
    parent_path: String,
    directory_name: String,
    expected_account: Option<String>,
) -> Result<LocalCheckout, String> {
    offload(move || {
        ensure_scope(expected_account.as_deref())?;
        if directory_name.is_empty()
            || directory_name == "."
            || directory_name == ".."
            || directory_name.contains('/')
            || directory_name.contains('\\')
        {
            return Err("LOCAL_INVALID_DIRECTORY".into());
        }
        if full_name.split('/').count() != 2
            || full_name.starts_with('-')
            || full_name.contains("..")
        {
            return Err("LOCAL_INVALID_PATH".into());
        }
        let parent = canonical_parent(&parent_path)?;
        let dest = parent.join(&directory_name);
        if std::fs::symlink_metadata(&dest).is_ok() {
            return Err("LOCAL_DESTINATION_EXISTS".into());
        }
        let dest_str = dest.to_str().ok_or("LOCAL_INVALID_PATH")?;
        let host = gh::host();
        let out = if Command::new("gh").arg("--version").output().is_ok() {
            Command::new("gh")
                .env("GH_HOST", &host)
                .env("GIT_TERMINAL_PROMPT", "0")
                .args(["repo", "clone", &full_name, dest_str])
                .output()
        } else {
            let url = format!("https://{host}/{full_name}.git");
            Command::new("git")
                .env("GIT_TERMINAL_PROMPT", "0")
                .args(["clone", &url, dest_str])
                .output()
        }
        .map_err(|_| "LOCAL_GIT_UNAVAILABLE".to_string())?;
        if !out.status.success() {
            return Err(format!(
                "LOCAL_CLONE_FAILED:{}",
                String::from_utf8_lossy(&out.stderr).trim()
            ));
        }
        let c = checkout_probe(&full_name, dest.to_str().unwrap());
        let path = dest.to_string_lossy().into_owned();
        ensure_scope(expected_account.as_deref())
            .map_err(|e| format!("LOCAL_CLONE_SAVED_FAILED:{path}:{e}"))?;
        let s = config::storage().map_err(|e| format!("LOCAL_CLONE_SAVED_FAILED:{path}:{e}"))?;
        let mut f = s
            .checkout_folders()
            .map_err(|e| format!("LOCAL_CLONE_SAVED_FAILED:{path}:{e}"))?;
        let paths = f.entry(full_name).or_default();
        if !paths.contains(&path) {
            paths.push(path.clone());
        }
        s.save_checkout_folders(f)
            .map_err(|error| format!("LOCAL_CLONE_SAVED_FAILED:{path}:{error}"))?;
        Ok(c)
    })
    .await?
}

#[tauri::command]
pub(crate) async fn open_local_checkout(
    full_name: String,
    path: String,
    target: String,
    expected_account: Option<String>,
) -> Result<(), String> {
    offload(move || {
        ensure_scope(expected_account.as_deref())?;
        let registered = config::storage()?
            .checkout_folders()?
            .get(&full_name)
            .is_some_and(|paths| paths.iter().any(|p| p == &path));
        if !registered {
            return Err("LOCAL_CHECKOUT_UNAVAILABLE".into());
        }
        let c = checkout_probe(&full_name, &path);
        if c.status != "ready" {
            return Err("LOCAL_CHECKOUT_UNAVAILABLE".into());
        }
        let program = match target.as_str() {
            "folder" => {
                if cfg!(target_os = "macos") {
                    "open"
                } else if cfg!(target_os = "windows") {
                    "explorer"
                } else {
                    "xdg-open"
                }
            }
            "vscode" => "code",
            "cursor" => "cursor",
            "zed" => "zed",
            _ => return Err("LOCAL_INVALID_TARGET".into()),
        };
        Command::new(program)
            .arg(&path)
            .spawn()
            .map_err(|_| "LOCAL_EDITOR_UNAVAILABLE".into())
            .map(|_| ())
    })
    .await?
}

fn merge_cached_traffic(
    current: &mut Option<Traffic>,
    status: &mut TrafficStatus,
    saved: &mut Option<Traffic>,
) {
    if current.is_none() && !matches!(status, TrafficStatus::Ok) {
        if let Some(cached) = saved.take() {
            *current = Some(cached);
            if matches!(status, TrafficStatus::Unavailable) {
                *status = TrafficStatus::Ok;
            }
        }
    }
}

async fn offload<T, F>(f: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> T + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(move || config::serialized(f))
        .await
        .map_err(|e| format!("background task failed: {e}"))
}

#[tauri::command]
pub(crate) async fn get_status() -> Result<Status, String> {
    offload(|| {
        let status = gh::status();
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

#[tauri::command]
pub(crate) async fn get_cache() -> Result<Option<Cache>, String> {
    offload(|| config::storage()?.load_cache()).await?
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
            cache_path: config::storage()
                .and_then(|db| db.cache_path())
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

#[tauri::command]
pub(crate) async fn list_catalog(
    expected_account: Option<String>,
) -> Result<Vec<CatalogRepo>, String> {
    offload(move || {
        ensure_scope(expected_account.as_deref())?;
        ensure_online()?;
        config::storage()?.save_catalog(gh::list_catalog()?)
    })
    .await?
}

#[tauri::command]
pub(crate) async fn refresh_tracked(expected_account: Option<String>) -> Result<Cache, String> {
    offload(move || {
        ensure_scope(expected_account.as_deref())?;
        ensure_online()?;
        let db = config::storage()?;
        let cfg = db.load_config()?;
        let mut store = config::storage()?.load_history()?;
        let seed_for: HashSet<String> = cfg
            .repos
            .iter()
            .filter(|name| history::needs_star_seed(&store, name))
            .cloned()
            .collect();
        let previous = db.load_cache()?;
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
        let repos = merge_fetches(fetches, &prev, &mut store, now)?;
        config::storage()?.save_history(&store)?;
        config::storage()?.save_cache(repos, store.repos)
    })
    .await?
}

#[tauri::command]
pub(crate) async fn list_create_options(
    expected_account: Option<String>,
) -> Result<CreateOptions, String> {
    offload(move || {
        ensure_scope(expected_account.as_deref())?;
        ensure_online()?;
        gh::list_create_options()
    })
    .await?
}

#[tauri::command]
pub(crate) async fn create_repo(
    input: CreateRepoInput,
    expected_account: Option<String>,
) -> Result<CreatedRepo, String> {
    offload(move || {
        ensure_scope(expected_account.as_deref())?;
        ensure_online()?;
        gh::create_repo(input)
    })
    .await?
}

#[tauri::command]
pub(crate) async fn get_repo_detail(
    full_name: String,
    offline: bool,
    expected_account: Option<String>,
) -> Result<config::Saved<RepoDetail>, String> {
    offload(move || {
        ensure_scope(expected_account.as_deref())?;
        let db = config::storage()?;
        let old = db.load_detail(&full_name)?;
        if offline {
            return old.ok_or(
                "This detail has not been saved. Connect and open it once to use it offline."
                    .into(),
            );
        }
        let mut detail = match ensure_online().and_then(|_| gh::repo_detail(full_name.clone())) {
            Ok(detail) => detail,
            Err(error) => {
                return old
                    .map(|mut saved| {
                        saved.warning = Some(error.clone());
                        saved
                    })
                    .ok_or(error)
            }
        };
        if let (Some(_error), Some(mut saved)) = (&detail.traffic_error, old) {
            let views_failed = !matches!(detail.views_status, crate::models::TrafficStatus::Ok)
                && detail.views.is_none();
            let clones_failed = !matches!(detail.clones_status, crate::models::TrafficStatus::Ok)
                && detail.clones.is_none();
            // Auxiliary endpoint failures do not invalidate fresh traffic.
            if views_failed {
                merge_cached_traffic(
                    &mut detail.views,
                    &mut detail.views_status,
                    &mut saved.data.views,
                );
            }
            if clones_failed {
                merge_cached_traffic(
                    &mut detail.clones,
                    &mut detail.clones_status,
                    &mut saved.data.clones,
                );
            }
        }
        let mut store = config::storage()?.load_history()?;
        let now = history::now_secs();
        if history::needs_star_seed(&store, &full_name) && detail.stars > 0 {
            if let Ok(seed) =
                gh::star_series(&full_name, detail.stars, detail.created_at.as_deref())
            {
                store.repos.entry(full_name.clone()).or_default().stars = seed;
            }
        }
        let snapshot = TrackedRepo {
            fetched_at: Some(now),
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
        config::storage()?.save_history(&store)?;
        if let Some(entry) = store.repos.get(&full_name) {
            detail.star_history = entry.stars.clone();
            detail.download_history = entry.downloads.clone();
        }
        db.save_detail(detail)
    })
    .await?
}

fn account_key(status: &Status) -> Result<String, String> {
    Ok(format!(
        "{}/{}",
        gh::host(),
        status
            .login
            .as_deref()
            .ok_or("GitHub account is unavailable.")?
    )
    .to_lowercase())
}
fn ensure_online() -> Result<(), String> {
    let status = gh::status();
    if !status.ok {
        return Err(status.error.unwrap_or("GitHub is unavailable.".into()));
    }
    if config::storage()?.account()?.as_deref() != Some(&account_key(&status)?) {
        return Err("GitHub account changed. Check connection to load that account’s data.".into());
    }
    Ok(())
}
#[tauri::command]
pub(crate) async fn get_cached_detail(
    full_name: String,
    expected_account: Option<String>,
) -> Result<Option<config::Saved<RepoDetail>>, String> {
    offload(move || {
        ensure_scope(expected_account.as_deref())?;
        config::storage()?.load_detail(&full_name)
    })
    .await?
}
#[tauri::command]
pub(crate) async fn get_local_state() -> Result<config::LocalState, String> {
    offload(|| config::storage()?.local_state()).await?
}
#[tauri::command]
pub(crate) async fn use_legacy_data() -> Result<config::LocalState, String> {
    offload(move || {
        let db = config::storage()?;
        db.activate("legacy".into())?;
        db.local_state()
    })
    .await?
}
#[tauri::command]
pub(crate) async fn import_legacy_data(
    expected_account: Option<String>,
) -> Result<config::LocalState, String> {
    offload(move || {
        ensure_scope(expected_account.as_deref())?;
        ensure_online()?;
        config::storage()?.import_legacy()
    })
    .await?
}
#[tauri::command]
pub(crate) async fn clear_local_cache(
    expected_account: Option<String>,
) -> Result<config::LocalState, String> {
    offload(move || {
        ensure_scope(expected_account.as_deref())?;
        config::storage()?.clear_cache()
    })
    .await?
}

fn ensure_scope(expected: Option<&str>) -> Result<(), String> {
    if config::storage()?.account()?.as_deref() != expected {
        return Err("Account changed. Reload the current account before continuing.".into());
    }
    Ok(())
}

fn merge_fetches(
    fetches: Vec<gh::TrackedFetch>,
    prev: &HashMap<String, TrackedRepo>,
    store: &mut crate::models::HistoryStore,
    now: u64,
) -> Result<Vec<TrackedRepo>, String> {
    if !fetches.is_empty() && fetches.iter().all(|f| f.repo.error.is_some()) {
        return Err(format!(
            "No repositories could be refreshed. Saved data was kept. {}",
            fetches[0].repo.error.as_deref().unwrap_or_default()
        ));
    }
    let repos = fetches
        .into_iter()
        .filter_map(|fetch| {
            if fetch.repo.error.is_some() {
                return prev.get(&fetch.repo.full_name).cloned().map(|mut old| {
                    old.error = fetch.repo.error;
                    old.stars_delta = None;
                    old.forks_delta = None;
                    old.downloads_delta = None;
                    old
                });
            }
            history::apply_fetch(store, &fetch.repo, fetch.star_seed, now);
            let mut repo = fetch.repo;
            if let Some(old) = prev.get(&repo.full_name) {
                repo.stars_delta = Some(repo.stars as i64 - old.stars as i64);
                repo.forks_delta = Some(repo.forks as i64 - old.forks as i64);
                repo.downloads_delta = Some(repo.downloads as i64 - old.downloads as i64);
            }
            repo.fetched_at = Some(now);
            Some(repo)
        })
        .collect();
    Ok(repos)
}

#[cfg(test)]
mod offline_tests {
    use super::*;
    fn traffic(fetched_at: u64, sample_from: u64, sample_to: u64) -> Traffic {
        Traffic {
            count: 4,
            uniques: 2,
            days: vec![],
            fetched_at: Some(fetched_at),
            sample_from: Some(sample_from),
            sample_to: Some(sample_to),
        }
    }
    fn repo(name: &str, error: Option<String>) -> TrackedRepo {
        TrackedRepo {
            full_name: name.into(),
            fetched_at: Some(100),
            description: None,
            private: true,
            language: None,
            stars: 10,
            forks: 2,
            downloads: 40,
            platforms: Default::default(),
            stars_delta: None,
            forks_delta: None,
            downloads_delta: None,
            error,
        }
    }
    #[test]
    fn partial_refresh_keeps_old_values_dates_and_does_not_snapshot_errors() {
        let old = repo("one/saved", None);
        let prev = HashMap::from([(old.full_name.clone(), old)]);
        let mut failed = repo("one/saved", Some("network".into()));
        failed.stars = 0;
        failed.downloads = 0;
        let fetches = vec![
            failed,
            repo("one/new-failure", Some("denied".into())),
            repo("one/fresh", None),
        ]
        .into_iter()
        .map(|repo| gh::TrackedFetch {
            repo,
            star_seed: None,
        })
        .collect();
        let mut history = crate::models::HistoryStore::default();
        let rows = merge_fetches(fetches, &prev, &mut history, 500).unwrap();
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[0].stars, 10);
        assert_eq!(rows[0].downloads, 40);
        assert_eq!(rows[0].fetched_at, Some(100));
        assert_eq!(rows[1].fetched_at, Some(500));
        assert!(history.repos.get("one/saved").is_none());
        assert!(history.repos.contains_key("one/fresh"));
    }
    #[test]
    fn total_failure_does_not_produce_replacement_cache() {
        let mut history = crate::models::HistoryStore::default();
        let result = merge_fetches(
            vec![gh::TrackedFetch {
                repo: repo("one/repo", Some("timeout".into())),
                star_seed: None,
            }],
            &HashMap::new(),
            &mut history,
            500,
        );
        assert!(result.is_err());
        assert!(history.repos.is_empty());
    }

    #[test]
    fn failed_views_use_cached_metadata_while_fresh_clones_stay() {
        let mut views = None;
        let mut views_status = TrafficStatus::Forbidden;
        let mut cached_views = Some(traffic(100, 10, 20));
        let fresh_clones = Some(traffic(500, 30, 40));
        let mut clones = fresh_clones.clone();
        let mut clones_status = TrafficStatus::Ok;
        let mut cached_clones = Some(traffic(100, 10, 20));
        merge_cached_traffic(&mut views, &mut views_status, &mut cached_views);
        merge_cached_traffic(&mut clones, &mut clones_status, &mut cached_clones);
        assert_eq!(views.unwrap().fetched_at, Some(100));
        assert_eq!(views_status, TrafficStatus::Forbidden);
        assert_eq!(clones.unwrap().fetched_at, fresh_clones.unwrap().fetched_at);
        assert!(cached_clones.is_some());
    }

    #[test]
    fn missing_cache_keeps_permission_status_and_auxiliary_error_does_not_replace_fresh_data() {
        let mut views = None;
        let mut status = TrafficStatus::Forbidden;
        let mut no_cache = None;
        merge_cached_traffic(&mut views, &mut status, &mut no_cache);
        assert!(views.is_none());
        assert_eq!(status, TrafficStatus::Forbidden);

        let mut fresh = Some(traffic(500, 30, 40));
        let mut saved = Some(traffic(100, 10, 20));
        let mut fresh_status = TrafficStatus::Ok;
        merge_cached_traffic(&mut fresh, &mut fresh_status, &mut saved);
        assert_eq!(fresh.unwrap().fetched_at, Some(500));
        assert!(saved.is_some());
    }
}
