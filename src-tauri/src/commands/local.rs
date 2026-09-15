use std::path::Path;
use std::process::Command;

use crate::config;
use crate::gh;
use crate::models::LocalCheckout;

use super::state::ensure_scope;
use super::status::offload;

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
