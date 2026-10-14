use crate::gh;
use crate::models::LocalCheckout;
use std::path::Path;
use std::process::Command;

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
