//! Local Git branch and sync operations for linked checkouts (Phase 5).
//!
//! Read-only status plus fetch / fast-forward-only pull / push / branch
//! switch / branch creation. There is intentionally no force-push, no
//! destructive reset and no automatic stashing: operations that would touch
//! uncommitted changes fail with `GIT_DIRTY`, and a pull that cannot
//! fast-forward fails with `GIT_DIVERGED`.
//!
//! Mutating commands serialize per checkout directory; independent checkouts
//! can run concurrently. The pure `*_dir` helpers below take a directory and
//! are covered by filesystem tests without any app state or network.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::{Arc, Mutex, OnceLock};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct GitSyncStatus {
    pub branch: Option<String>,
    pub detached: bool,
    pub head: Option<String>,
    pub local_branches: Vec<String>,
    pub remote_branches: Vec<String>,
    pub upstream: Option<String>,
    pub clean: bool,
    pub staged: u32,
    pub unstaged: u32,
    pub untracked: u32,
    pub ahead: Option<u64>,
    pub behind: Option<u64>,
    pub last_fetch: Option<u64>,
}

fn git_missing(error: &std::io::Error) -> bool {
    error.kind() == std::io::ErrorKind::NotFound
}

fn run_git(dir: &Path, args: &[&str]) -> Result<std::process::Output, String> {
    Command::new("git")
        .args(["-C"])
        .arg(dir)
        .args(args)
        .env("GIT_TERMINAL_PROMPT", "0")
        .output()
        .map_err(|e| {
            if git_missing(&e) {
                "GIT_UNAVAILABLE".to_string()
            } else {
                format!("GIT_FAILED:{}", e)
            }
        })
}

fn stdout_text(out: &std::process::Output) -> String {
    String::from_utf8_lossy(&out.stdout).trim().to_string()
}

fn stderr_text(out: &std::process::Output) -> String {
    String::from_utf8_lossy(&out.stderr).trim().to_string()
}

fn ref_lines(dir: &Path, namespace: &str) -> Result<Vec<String>, String> {
    let out = run_git(
        dir,
        &["for-each-ref", "--format=%(refname:short)", namespace],
    )?;
    if !out.status.success() {
        return Err(format!("GIT_FAILED:{}", stderr_text(&out)));
    }
    Ok(stdout_text(&out)
        .lines()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        // Drop symbolic refs such as `origin/HEAD`.
        .filter(|s| !s.ends_with("/HEAD"))
        .map(str::to_string)
        .collect())
}

fn current_upstream(dir: &Path) -> Option<String> {
    let out = run_git(
        dir,
        &["rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}"],
    )
    .ok()?;
    if !out.status.success() {
        return None;
    }
    let name = stdout_text(&out);
    if name.is_empty() || name == "@{u}" {
        None
    } else {
        Some(name)
    }
}

fn worktree_counts(dir: &Path) -> Result<(u32, u32, u32), String> {
    let out = run_git(dir, &["status", "--porcelain=v1"])?;
    if !out.status.success() {
        return Err(format!("GIT_FAILED:{}", stderr_text(&out)));
    }
    // NOTE: porcelain columns are positional; never trim the line start.
    let body = String::from_utf8_lossy(&out.stdout).into_owned();
    let mut staged = 0u32;
    let mut unstaged = 0u32;
    let mut untracked = 0u32;
    for line in body.lines() {
        let mut chars = line.chars();
        let (Some(x), Some(y)) = (chars.next(), chars.next()) else {
            continue;
        };
        if x == '?' && y == '?' {
            untracked += 1;
        } else {
            if x != ' ' {
                staged += 1;
            }
            if y != ' ' {
                unstaged += 1;
            }
        }
    }
    Ok((staged, unstaged, untracked))
}

fn ahead_behind(dir: &Path) -> (Option<u64>, Option<u64>) {
    let out = run_git(dir, &["rev-list", "--left-right", "--count", "HEAD...@{u}"]).ok();
    let Some(out) = out else { return (None, None) };
    if !out.status.success() {
        return (None, None);
    }
    let text = stdout_text(&out);
    let mut parts = text.split_whitespace();
    match (parts.next(), parts.next()) {
        (Some(a), Some(b)) => (a.parse().ok(), b.parse().ok()),
        _ => (None, None),
    }
}

fn last_fetch_at(dir: &Path) -> Option<u64> {
    let out = run_git(dir, &["rev-parse", "--git-dir"]).ok()?;
    if !out.status.success() {
        return None;
    }
    let git_dir = stdout_text(&out);
    let fetch_head = if Path::new(&git_dir).is_absolute() {
        PathBuf::from(&git_dir)
    } else {
        dir.join(&git_dir)
    }
    .join("FETCH_HEAD");
    fetch_head
        .metadata()
        .ok()?
        .modified()
        .ok()?
        .duration_since(std::time::UNIX_EPOCH)
        .ok()
        .map(|d| d.as_secs())
}

/// Read-only branch/sync snapshot for a checkout directory.
pub fn sync_status_dir(dir: &Path) -> Result<GitSyncStatus, String> {
    let top = run_git(dir, &["rev-parse", "--show-toplevel"])?;
    if !top.status.success() {
        return Err("GIT_NOT_GIT".into());
    }
    let branch_out = run_git(dir, &["branch", "--show-current"])?;
    let branch = if branch_out.status.success() {
        let name = stdout_text(&branch_out);
        if name.is_empty() {
            None
        } else {
            Some(name)
        }
    } else {
        None
    };
    let detached = branch.is_none();
    let head = run_git(dir, &["rev-parse", "--short", "HEAD"])
        .ok()
        .filter(|o| o.status.success())
        .map(|o| stdout_text(&o))
        .filter(|s| !s.is_empty());
    let local_branches = ref_lines(dir, "refs/heads/")?;
    let remote_branches = ref_lines(dir, "refs/remotes/")?;
    let upstream = current_upstream(dir);
    let (staged, unstaged, untracked) = worktree_counts(dir)?;
    let (ahead, behind) = if upstream.is_some() {
        ahead_behind(dir)
    } else {
        (None, None)
    };
    Ok(GitSyncStatus {
        branch,
        detached,
        head,
        local_branches,
        remote_branches,
        upstream,
        clean: staged == 0 && unstaged == 0 && untracked == 0,
        staged,
        unstaged,
        untracked,
        ahead,
        behind,
        last_fetch: last_fetch_at(dir),
    })
}

fn classify_remote_error(stderr: &str) -> String {
    let lower = stderr.to_lowercase();
    if lower.contains("authentication failed")
        || lower.contains("could not read username")
        || lower.contains("could not read password")
        || lower.contains("permission denied (publickey)")
        || lower.contains("401 unauthorized")
        || lower.contains("403 forbidden")
    {
        format!("GIT_AUTH_FAILED:{stderr}")
    } else {
        format!("GIT_REMOTE_FAILED:{stderr}")
    }
}

fn require_branch(status: &GitSyncStatus) -> Result<String, String> {
    status
        .branch
        .clone()
        .ok_or_else(|| "GIT_DETACHED".to_string())
}

/// Fetch the default remote with pruning, then return a fresh status.
pub fn fetch_dir(dir: &Path) -> Result<GitSyncStatus, String> {
    let out = run_git(dir, &["fetch", "--prune"])?;
    if !out.status.success() {
        return Err(classify_remote_error(&stderr_text(&out)));
    }
    sync_status_dir(dir)
}

/// Fast-forward-only pull. Divergence and local changes are reported with
/// dedicated codes instead of being resolved automatically.
pub fn pull_ff_dir(dir: &Path) -> Result<GitSyncStatus, String> {
    let status = sync_status_dir(dir)?;
    require_branch(&status)?;
    if status.upstream.is_none() {
        return Err("GIT_NO_UPSTREAM".into());
    }
    let out = run_git(dir, &["pull", "--ff-only"])?;
    if !out.status.success() {
        let stderr = stderr_text(&out);
        let lower = stderr.to_lowercase();
        if lower.contains("not possible to fast-forward")
            || lower.contains("divergent branches")
            || lower.contains("need to specify how to reconcile")
        {
            return Err("GIT_DIVERGED".into());
        }
        if lower.contains("would be overwritten by merge")
            || lower.contains("your local changes")
            || lower.contains("uncommitted changes")
        {
            return Err("GIT_DIRTY".into());
        }
        return Err(classify_remote_error(&stderr));
    }
    sync_status_dir(dir)
}

/// Push the current branch. Without an upstream this fails with
/// `GIT_NO_UPSTREAM` unless `set_upstream` is set, in which case the branch
/// is pushed to `remote` and the upstream is recorded. Never force-pushes.
pub fn push_dir(dir: &Path, remote: &str, set_upstream: bool) -> Result<GitSyncStatus, String> {
    let status = sync_status_dir(dir)?;
    let branch = require_branch(&status)?;
    if status.upstream.is_none() && !set_upstream {
        return Err("GIT_NO_UPSTREAM".into());
    }
    let out = if status.upstream.is_some() {
        run_git(dir, &["push"])?
    } else {
        run_git(dir, &["push", "-u", remote, &branch])?
    };
    if !out.status.success() {
        let stderr = stderr_text(&out);
        let lower = stderr.to_lowercase();
        if lower.contains("non-fast-forward")
            || lower.contains("[rejected]")
            || lower.contains("fetch first")
        {
            return Err("GIT_PUSH_REJECTED".into());
        }
        return Err(classify_remote_error(&stderr));
    }
    sync_status_dir(dir)
}

/// Switch to an existing local branch. Refuses to run with a dirty worktree
/// so local changes are never carried across branches implicitly.
pub fn switch_branch_dir(dir: &Path, branch: &str) -> Result<GitSyncStatus, String> {
    if branch.trim().is_empty() {
        return Err("GIT_INVALID_BRANCH".into());
    }
    let status = sync_status_dir(dir)?;
    if !status.local_branches.iter().any(|b| b == branch) {
        return Err("GIT_BRANCH_NOT_FOUND".into());
    }
    if !status.clean {
        return Err("GIT_DIRTY".into());
    }
    let out = run_git(dir, &["checkout", branch])?;
    if !out.status.success() {
        let stderr = stderr_text(&out);
        if stderr.to_lowercase().contains("your local changes") {
            return Err("GIT_DIRTY".into());
        }
        return Err(format!("GIT_SWITCH_FAILED:{stderr}"));
    }
    sync_status_dir(dir)
}

/// Create a local branch, optionally switching to it. Switching with a dirty
/// worktree is refused; creating without switching never touches the worktree.
pub fn create_branch_dir(dir: &Path, branch: &str, switch: bool) -> Result<GitSyncStatus, String> {
    if branch.trim().is_empty() {
        return Err("GIT_INVALID_BRANCH".into());
    }
    let format = run_git(dir, &["check-ref-format", "--branch", branch])?;
    if !format.status.success() {
        return Err("GIT_INVALID_BRANCH".into());
    }
    let status = sync_status_dir(dir)?;
    if status.local_branches.iter().any(|b| b == branch) {
        return Err("GIT_BRANCH_EXISTS".into());
    }
    if switch && !status.clean {
        return Err("GIT_DIRTY".into());
    }
    let created = run_git(dir, &["branch", branch])?;
    if !created.status.success() {
        return Err(format!("GIT_CREATE_FAILED:{}", stderr_text(&created)));
    }
    if switch {
        return switch_branch_dir(dir, branch);
    }
    sync_status_dir(dir)
}

pub async fn read_only<T, F>(f: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    tauri::async_runtime::spawn_blocking(f)
        .await
        .map_err(|e| format!("background task failed: {e}"))?
}

// ---------------------------------------------------------------------------
// Tauri commands. Status is read-only; mutating operations serialize per
// checkout directory via `serialized_on`.
// ---------------------------------------------------------------------------

#[tauri::command]
pub(crate) async fn git_sync_status(
    full_name: String,
    path: String,
    expected_account: Option<String>,
) -> Result<GitSyncStatus, String> {
    let dir =
        crate::commands::require_ready_checkout(&full_name, &path, expected_account.as_deref())?;
    read_only(move || sync_status_dir(&dir)).await
}

#[tauri::command]
pub(crate) async fn git_fetch(
    full_name: String,
    path: String,
    expected_account: Option<String>,
) -> Result<GitSyncStatus, String> {
    let dir =
        crate::commands::require_ready_checkout(&full_name, &path, expected_account.as_deref())?;
    serialized_on(dir.clone(), move || fetch_dir(&dir)).await
}

#[tauri::command]
pub(crate) async fn git_pull(
    full_name: String,
    path: String,
    expected_account: Option<String>,
) -> Result<GitSyncStatus, String> {
    let dir =
        crate::commands::require_ready_checkout(&full_name, &path, expected_account.as_deref())?;
    serialized_on(dir.clone(), move || pull_ff_dir(&dir)).await
}

#[tauri::command]
pub(crate) async fn git_push(
    full_name: String,
    path: String,
    set_upstream: bool,
    expected_account: Option<String>,
) -> Result<GitSyncStatus, String> {
    let dir =
        crate::commands::require_ready_checkout(&full_name, &path, expected_account.as_deref())?;
    let remote = crate::commands::matching_remote_name(&full_name, &dir)
        .ok_or_else(|| "LOCAL_REMOTE_MISMATCH".to_string())?;
    serialized_on(dir.clone(), move || push_dir(&dir, &remote, set_upstream)).await
}

#[tauri::command]
pub(crate) async fn git_switch_branch(
    full_name: String,
    path: String,
    branch: String,
    expected_account: Option<String>,
) -> Result<GitSyncStatus, String> {
    let dir =
        crate::commands::require_ready_checkout(&full_name, &path, expected_account.as_deref())?;
    serialized_on(dir.clone(), move || switch_branch_dir(&dir, &branch)).await
}

#[tauri::command]
pub(crate) async fn git_create_branch(
    full_name: String,
    path: String,
    branch: String,
    switch: bool,
    expected_account: Option<String>,
) -> Result<GitSyncStatus, String> {
    let dir =
        crate::commands::require_ready_checkout(&full_name, &path, expected_account.as_deref())?;
    serialized_on(dir.clone(), move || {
        create_branch_dir(&dir, &branch, switch)
    })
    .await
}

static SLOTS: OnceLock<Mutex<HashMap<PathBuf, Arc<Mutex<()>>>>> = OnceLock::new();

fn slot_for(dir: &Path) -> Arc<Mutex<()>> {
    let key = dir.canonicalize().unwrap_or_else(|_| dir.to_path_buf());
    let map = SLOTS.get_or_init(|| Mutex::new(HashMap::new()));
    let mut guard = map.lock().unwrap_or_else(|e| e.into_inner());
    guard
        .entry(key)
        .or_insert_with(|| Arc::new(Mutex::new(())))
        .clone()
}

pub async fn serialized_on<T, F>(dir: PathBuf, f: F) -> Result<T, String>
where
    T: Send + 'static,
    F: FnOnce() -> Result<T, String> + Send + 'static,
{
    let slot = slot_for(&dir);
    tauri::async_runtime::spawn_blocking(move || {
        let _guard = slot.lock().unwrap_or_else(|e| e.into_inner());
        f()
    })
    .await
    .map_err(|e| format!("background task failed: {e}"))?
}
