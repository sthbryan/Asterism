use std::collections::HashMap;
use std::path::Path;
use std::process::Command;

use crate::config;
use crate::gh;
use crate::history;
use crate::models::{
    Cache, CatalogRepo, Config, CreateOptions, CreateRepoInput, CreatedRepo, Diagnostics,
    LocalCheckout, Locale, PullListResult, PullRequestDetail, PullRequestSummary, RepoDetail,
    Status, ThemePref, TrackedRepo, Traffic, TrafficStatus,
};
use crate::pulls;
use crate::pulls::PullRequestFilters;

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

async fn offload_unlocked<T, F>(f: F) -> Result<T, String>
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
    offload_unlocked(move || {
        ensure_scope(expected_account.as_deref())?;
        ensure_online()?;
        let rows = gh::list_catalog()?;
        config::serialized(move || config::storage()?.save_catalog(rows))
    })
    .await?
}

#[tauri::command]
pub(crate) async fn refresh_tracked(expected_account: Option<String>) -> Result<Cache, String> {
    offload_unlocked(move || {
        ensure_scope(expected_account.as_deref())?;
        ensure_online()?;
        let db = config::storage()?;
        let cfg = db.load_config()?;
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
        let fetches = gh::refresh_tracked(cfg.repos);
        let now = history::now_secs();
        config::serialized(move || {
            let db = config::storage()?;
            let mut store = db.load_history()?;
            let repos = merge_fetches(fetches, &prev, &mut store, now)?;
            db.save_history(&store)?;
            db.save_cache(repos, store.repos)
        })
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
    offload_unlocked(move || {
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
        let now = history::now_secs();
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
        config::serialized(move || {
            let db = config::storage()?;
            let mut store = db.load_history()?;
            history::apply_fetch(&mut store, &snapshot, now);
            db.save_history(&store)?;
            if let Some(entry) = store.repos.get(&full_name) {
                detail.star_history = entry.stars.clone();
                detail.download_history = entry.downloads.clone();
            }
            db.save_detail(detail)
        })
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
    let Some(status) = gh::last_status() else {
        return Ok(());
    };
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
    offload_unlocked(move || {
        ensure_scope(expected_account.as_deref())?;
        config::storage()?.load_detail(&full_name)
    })
    .await?
}

fn valid_pull_repo(repo: &str) -> bool {
    let mut parts = repo.split('/');
    let owner = parts.next().unwrap_or_default();
    let name = parts.next().unwrap_or_default();
    parts.next().is_none()
        && !owner.is_empty()
        && !name.is_empty()
        && !repo.starts_with('-')
        && !repo.contains("..")
        && repo
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || ".-_/".contains(c))
}

fn normalize_pull_page(page: u32, per_page: u8) -> (u32, u8) {
    (
        page.clamp(1, pulls::MAX_PAGE),
        per_page.clamp(1, pulls::MAX_PAGE_SIZE),
    )
}

fn followed_pull_repos(
    db: &config::Storage<tauri::Wry>,
    requested: Option<&str>,
) -> Result<Vec<String>, String> {
    let repos = db.load_config()?.repos;
    if repos.len() > pulls::MAX_REPOS_PER_REFRESH {
        return Err("PR_REQUEST_LIMIT:too many followed repositories".into());
    }
    if let Some(repo) = requested {
        if !valid_pull_repo(repo) {
            return Err("PR_INVALID_REPOSITORY".into());
        }
        if !repos.iter().any(|name| name.eq_ignore_ascii_case(repo)) {
            return Err("PR_REPOSITORY_NOT_FOLLOWED".into());
        }
        return Ok(vec![repos
            .into_iter()
            .find(|name| name.eq_ignore_ascii_case(repo))
            .unwrap_or_else(|| repo.to_string())]);
    }
    Ok(repos)
}

fn followed_pull_repos_for(
    db: &config::Storage<tauri::Wry>,
    requested: &[String],
) -> Result<Vec<String>, String> {
    if requested.is_empty() {
        return followed_pull_repos(db, None);
    }
    if requested.len() > pulls::MAX_REPOS_PER_REFRESH {
        return Err("PR_REQUEST_LIMIT:too many repositories requested".into());
    }
    let all = db.load_config()?.repos;
    let mut selected = Vec::with_capacity(requested.len());
    for wanted in requested {
        if !valid_pull_repo(wanted) {
            return Err("PR_INVALID_REPOSITORY".into());
        }
        let actual = all
            .iter()
            .find(|name| name.eq_ignore_ascii_case(wanted))
            .ok_or_else(|| format!("PR_REPOSITORY_NOT_FOLLOWED:{wanted}"))?;
        if !selected
            .iter()
            .any(|name: &String| name.eq_ignore_ascii_case(actual))
        {
            selected.push(actual.clone());
        }
    }
    Ok(selected)
}

fn merge_pull_fetches(
    repos: &[String],
    fetches: impl IntoIterator<Item = (String, Vec<PullRequestSummary>, Option<String>)>,
    previous: Option<&PullListResult>,
    fetched_at: u64,
    preserve_outside: bool,
) -> PullListResult {
    let mut pulls = Vec::new();
    let mut errors = std::collections::BTreeMap::new();
    let old = previous.map(|result| &result.pulls);
    for (repo, fresh, error) in fetches {
        if let Some(error) = error {
            errors.insert(repo.clone(), error);
            if let Some(old) = old {
                pulls.extend(
                    old.iter()
                        .filter(|pull| pull.repo.eq_ignore_ascii_case(&repo))
                        .cloned(),
                );
            }
        } else {
            pulls.extend(fresh);
        }
    }

    if preserve_outside {
        if let Some(old) = old {
            let selected = &repos[0];
            pulls.extend(
                old.iter()
                    .filter(|pull| !pull.repo.eq_ignore_ascii_case(selected))
                    .cloned(),
            );
        }
    }
    pulls.sort_by(|a, b| a.repo.cmp(&b.repo).then_with(|| b.number.cmp(&a.number)));
    pulls.dedup_by(|a, b| a.repo.eq_ignore_ascii_case(&b.repo) && a.number == b.number);
    let total = pulls.len() as u64;
    PullListResult {
        pulls,
        errors,
        fetched_at,
        page: 1,
        per_page: pulls::MAX_LIST_LIMIT,
        total,
        has_next_page: false,
    }
}

fn pull_snapshot(
    expected_account: Option<&str>,
    filters: &PullRequestFilters,
    previous: Option<PullListResult>,
) -> Result<config::Saved<PullListResult>, String> {
    ensure_scope(expected_account)?;
    let db = config::storage()?;
    let normalized = filters.clone().normalized();
    let repos = if !normalized.repos.is_empty() {
        followed_pull_repos_for(&db, &normalized.repos)?
    } else {
        followed_pull_repos(&db, normalized.repo.as_deref())?
    };
    if repos.len() > pulls::MAX_REQUESTS_PER_REFRESH {
        return Err("PR_REQUEST_LIMIT:refresh would exceed request limit".into());
    }
    ensure_online()?;
    let state = normalized.state.as_deref();
    let fetches = repos.iter().map(|repo| {
        let (rows, error) = pulls::list_repo_pulls_state(repo, pulls::MAX_LIST_LIMIT, state);
        (repo.clone(), rows, error)
    });
    let now = history::now_secs();
    let result = merge_pull_fetches(
        &repos,
        fetches,
        previous.as_ref(),
        now,
        !normalized.repos.is_empty() || normalized.repo.is_some(),
    );
    db.save_pull_list(result)
}

#[tauri::command]
pub(crate) async fn get_cached_pull_requests(
    expected_account: Option<String>,
) -> Result<Option<config::Saved<PullListResult>>, String> {
    offload(move || {
        ensure_scope(expected_account.as_deref())?;
        config::storage()?.load_pull_list()
    })
    .await?
}

#[tauri::command]
pub(crate) async fn refresh_pull_requests(
    filters: PullRequestFilters,
    expected_account: Option<String>,
) -> Result<config::Saved<PullListResult>, String> {
    offload(move || {
        let db = config::storage()?;
        let old = db.load_pull_list()?.map(|saved| saved.data);
        pull_snapshot(expected_account.as_deref(), &filters, old)
    })
    .await?
}

#[tauri::command]
pub(crate) async fn list_pull_requests(
    repos: Vec<String>,
    _limit: u8,
    offline: bool,
    expected_account: Option<String>,
) -> Result<PullListResult, String> {
    offload(move || {
        ensure_scope(expected_account.as_deref())?;
        let filters = PullRequestFilters {
            repos,
            ..Default::default()
        };
        let db = config::storage()?;
        let cached = db.load_pull_list()?;
        let snapshot = if offline {
            cached
                .map(|saved| saved.data)
                .ok_or_else(|| "PR_OFFLINE_CACHE_MISSING".to_string())?
        } else {
            let old = cached.map(|saved| saved.data);
            match pull_snapshot(expected_account.as_deref(), &filters, old.clone()) {
                Ok(saved) => saved.data,
                Err(error) => old
                    .map(|mut result| {
                        result.errors.insert("__account".into(), error.clone());
                        result
                    })
                    .ok_or(error)?,
            }
        };

        Ok(snapshot)
    })
    .await?
}

#[tauri::command]
pub(crate) async fn list_pull_requests_filtered(
    filters: PullRequestFilters,
    page: u32,
    per_page: u8,
    offline: bool,
    expected_account: Option<String>,
) -> Result<PullListResult, String> {
    let repos = filters.repos.clone();
    let limit = pulls::MAX_LIST_LIMIT;
    let result = list_pull_requests(repos, limit, offline, expected_account).await?;
    let (page, per_page) = normalize_pull_page(page, per_page);
    Ok(pulls::paginate(
        result.pulls,
        result.errors,
        result.fetched_at,
        &filters,
        page,
        per_page,
    ))
}

#[tauri::command]
pub(crate) async fn get_cached_pull_request_detail(
    repo: String,
    number: u64,
    expected_account: Option<String>,
) -> Result<Option<config::Saved<PullRequestDetail>>, String> {
    offload(move || {
        ensure_scope(expected_account.as_deref())?;
        if !valid_pull_repo(&repo) || number == 0 {
            return Err("PR_INVALID_REQUEST".into());
        }
        let db = config::storage()?;
        let repo = followed_pull_repos(&db, Some(&repo))?
            .into_iter()
            .next()
            .ok_or_else(|| "PR_REPOSITORY_NOT_FOLLOWED".to_string())?;
        db.load_pull_detail(&repo, number)
    })
    .await?
}

#[tauri::command]
pub(crate) async fn get_pull_request_detail(
    repo: String,
    number: u64,
    offline: bool,
    expected_account: Option<String>,
) -> Result<config::Saved<PullRequestDetail>, String> {
    offload(move || {
        ensure_scope(expected_account.as_deref())?;
        if !valid_pull_repo(&repo) || number == 0 {
            return Err("PR_INVALID_REQUEST".into());
        }
        let db = config::storage()?;
        let repo = followed_pull_repos(&db, Some(&repo))?
            .into_iter()
            .next()
            .ok_or_else(|| "PR_REPOSITORY_NOT_FOLLOWED".to_string())?;
        let old = db.load_pull_detail(&repo, number)?;
        if offline {
            return old.ok_or_else(|| "PR_OFFLINE_CACHE_MISSING".into());
        }
        let fresh = ensure_online().and_then(|_| pulls::pull_detail(&repo, number));
        match fresh {
            Ok(detail) => db.save_pull_detail(detail),
            Err(error) => old
                .map(|mut saved| {
                    saved.warning = Some(error.clone());
                    saved
                })
                .ok_or(error),
        }
    })
    .await?
}

#[tauri::command]
pub(crate) async fn get_pull_request(
    repo: String,
    number: u64,
    offline: bool,
    expected_account: Option<String>,
) -> Result<config::Saved<PullRequestDetail>, String> {
    get_pull_request_detail(repo, number, offline, expected_account).await
}

#[tauri::command]
pub(crate) async fn get_cached_pull_request_diff(
    repo: String,
    number: u64,
    expected_account: Option<String>,
) -> Result<Option<config::Saved<String>>, String> {
    offload(move || {
        ensure_scope(expected_account.as_deref())?;
        if !valid_pull_repo(&repo) || number == 0 {
            return Err("PR_INVALID_REQUEST".into());
        }
        let db = config::storage()?;
        let repo = followed_pull_repos(&db, Some(&repo))?
            .into_iter()
            .next()
            .ok_or_else(|| "PR_REPOSITORY_NOT_FOLLOWED".to_string())?;
        db.load_pull_diff(&repo, number)
    })
    .await?
}

#[tauri::command]
pub(crate) async fn get_pull_request_diff(
    repo: String,
    number: u64,
    offline: bool,
    expected_account: Option<String>,
) -> Result<config::Saved<String>, String> {
    offload(move || {
        ensure_scope(expected_account.as_deref())?;
        if !valid_pull_repo(&repo) || number == 0 {
            return Err("PR_INVALID_REQUEST".into());
        }
        let db = config::storage()?;
        let repo = followed_pull_repos(&db, Some(&repo))?
            .into_iter()
            .next()
            .ok_or_else(|| "PR_REPOSITORY_NOT_FOLLOWED".to_string())?;
        let old = db.load_pull_diff(&repo, number)?;
        if offline {
            return old.ok_or_else(|| "PR_OFFLINE_CACHE_MISSING".into());
        }
        match ensure_online().and_then(|_| pulls::pull_diff(&repo, number)) {
            Ok(diff) => db.save_pull_diff(&repo, number, diff),
            Err(error) => old
                .map(|mut saved| {
                    saved.warning = Some(error.clone());
                    saved
                })
                .ok_or(error),
        }
    })
    .await?
}

#[tauri::command]
pub(crate) async fn get_pull_diff(
    repo: String,
    number: u64,
    offline: bool,
    expected_account: Option<String>,
) -> Result<config::Saved<String>, String> {
    get_pull_request_diff(repo, number, offline, expected_account).await
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

pub(crate) fn ensure_scope(expected: Option<&str>) -> Result<(), String> {
    if config::storage()?.account()?.as_deref() != expected {
        return Err("Account changed. Reload the current account before continuing.".into());
    }
    Ok(())
}

pub(crate) fn require_ready_checkout(
    full_name: &str,
    path: &str,
    expected_account: Option<&str>,
) -> Result<std::path::PathBuf, String> {
    ensure_scope(expected_account)?;
    let registered = config::storage()?
        .checkout_folders()?
        .get(full_name)
        .is_some_and(|paths| paths.iter().any(|p| p == path));
    if !registered {
        return Err("LOCAL_CHECKOUT_UNAVAILABLE".into());
    }
    let probe = checkout_probe(full_name, path);
    if probe.status != "ready" {
        return Err("LOCAL_CHECKOUT_UNAVAILABLE".into());
    }
    Path::new(path)
        .canonicalize()
        .map_err(|_| "LOCAL_INVALID_PATH".to_string())
}

pub(crate) fn matching_remote_name(full: &str, dir: &Path) -> Option<String> {
    let out = Command::new("git")
        .args(["-C"])
        .arg(dir)
        .args(["remote"])
        .output()
        .ok()?;
    if !out.status.success() {
        return None;
    }
    let stdout = String::from_utf8_lossy(&out.stdout).into_owned();
    stdout.lines().map(str::trim).find_map(|name| {
        if name.is_empty() {
            return None;
        }
        let url = Command::new("git")
            .args(["-C"])
            .arg(dir)
            .args(["remote", "get-url", name])
            .output()
            .ok()
            .map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string())?;
        remote_matches(full, &url).then(|| name.to_string())
    })
}

fn merge_fetches(
    fetches: Vec<TrackedRepo>,
    prev: &HashMap<String, TrackedRepo>,
    store: &mut crate::models::HistoryStore,
    now: u64,
) -> Result<Vec<TrackedRepo>, String> {
    if !fetches.is_empty() && fetches.iter().all(|f| f.error.is_some()) {
        return Err(format!(
            "No repositories could be refreshed. Saved data was kept. {}",
            fetches[0].error.as_deref().unwrap_or_default()
        ));
    }
    let repos = fetches
        .into_iter()
        .filter_map(|fetch| {
            if fetch.error.is_some() {
                return prev.get(&fetch.full_name).cloned().map(|mut old| {
                    old.error = fetch.error;
                    old.stars_delta = None;
                    old.forks_delta = None;
                    old.downloads_delta = None;
                    old
                });
            }
            history::apply_fetch(store, &fetch, now);
            let mut repo = fetch;
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
        ];
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
            vec![repo("one/repo", Some("timeout".into()))],
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
