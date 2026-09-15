use super::status::{run_git, stderr_text, sync_status_dir, GitSyncStatus};
use std::path::Path;

pub(crate) fn classify_remote_error(stderr: &str) -> String {
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

pub fn fetch_dir(dir: &Path) -> Result<GitSyncStatus, String> {
    let out = run_git(dir, &["fetch", "--prune"])?;
    if !out.status.success() {
        return Err(classify_remote_error(&stderr_text(&out)));
    }
    sync_status_dir(dir)
}

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
