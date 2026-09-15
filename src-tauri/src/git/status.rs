use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Command;


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

