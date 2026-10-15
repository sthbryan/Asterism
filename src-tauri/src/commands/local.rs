use std::process::Command;

use crate::config;
use crate::gh;
use crate::models::LocalCheckout;

pub(crate) use super::checkout::{
    canonical_parent, checkout_probe, remote_matches, remove_checkout_registration, validate_link,
};
use super::state::{ensure_scope, require_ready_checkout};
use super::status::{offload, offload_write};

#[tauri::command]
pub(crate) async fn list_local_checkouts(
    expected_account: Option<String>,
) -> Result<Vec<LocalCheckout>, String> {
    offload(move || {
        let f = config::serialized_write(|| {
            ensure_scope(expected_account.as_deref())?;
            config::storage()?.checkout_folders()
        })?;
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
        config::serialized_write(|| {
            ensure_scope(expected_account.as_deref())?;
            let s = config::storage()?;
            let mut f = s.checkout_folders()?;
            let e = f.entry(full_name).or_default();
            if !e.contains(&c.path) {
                e.push(c.path.clone());
            }
            s.save_checkout_folders(f)
        })?;
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
    offload_write(move || {
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
        config::serialized_write(|| {
            ensure_scope(expected_account.as_deref())?;
            let s = config::storage()?;
            let mut f = s.checkout_folders()?;
            let paths = f.entry(full_name).or_default();
            if !paths.contains(&path) {
                paths.push(path.clone());
            }
            s.save_checkout_folders(f)
        })
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
        require_ready_checkout(&full_name, &path, expected_account.as_deref())?;
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
