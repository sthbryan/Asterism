//! Filesystem-only coverage for Phase 5 Git branch/sync contracts.
//! Uses temporary repositories with a local bare remote; no network and no
//! real user data. Registered by lib.rs under cfg(test).
#![cfg(test)]

use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::atomic::{AtomicU64, Ordering};

use crate::git::{
    create_branch_dir, fetch_dir, pull_ff_dir, push_dir, switch_branch_dir, sync_status_dir,
};

static SEQ: AtomicU64 = AtomicU64::new(0);

fn temp_root(label: &str) -> PathBuf {
    let p = std::env::temp_dir().join(format!(
        "asterism-git-{label}-{}-{}",
        std::process::id(),
        SEQ.fetch_add(1, Ordering::SeqCst)
    ));
    let _ = fs::remove_dir_all(&p);
    fs::create_dir_all(&p).unwrap();
    p
}

fn git(dir: &Path, args: &[&str]) -> std::process::Output {
    Command::new("git")
        .args(["-C", dir.to_str().unwrap()])
        .args(args)
        .output()
        .unwrap()
}

fn configure(dir: &Path) {
    assert!(git(dir, &["config", "user.email", "test@example.com"]).status.success());
    assert!(git(dir, &["config", "user.name", "asterism-test"]).status.success());
}

fn commit_file(dir: &Path, name: &str, content: &str, message: &str) {
    fs::write(dir.join(name), content).unwrap();
    assert!(git(dir, &["add", name]).status.success());
    assert!(git(dir, &["commit", "-q", "-m", message]).status.success());
}

/// Seed repo with one commit pushed to a bare remote, plus a fresh clone.
fn fixture(label: &str) -> (PathBuf, PathBuf) {
    let root = temp_root(label);
    let remote = root.join("remote.git");
    assert!(
        Command::new("git")
            .args(["init", "--bare", "-q"])
            .arg(&remote)
            .output()
            .unwrap()
            .status
            .success()
    );
    let seed = root.join("seed");
    fs::create_dir_all(&seed).unwrap();
    assert!(git(&seed, &["init", "-q", "-b", "main"]).status.success());
    configure(&seed);
    commit_file(&seed, "file.txt", "v1\n", "initial");
    assert!(
        git(
            &seed,
            &["remote", "add", "origin", remote.to_str().unwrap()]
        )
        .status
        .success()
    );
    assert!(git(&seed, &["push", "-q", "-u", "origin", "main"]).status.success());
    let work = root.join("work");
    assert!(
        Command::new("git")
            .args(["clone", "-q", remote.to_str().unwrap()])
            .arg(&work)
            .output()
            .unwrap()
            .status
            .success()
    );
    configure(&work);
    (root, work)
}

fn peer_commit(root: &Path, name: &str, content: &str) {
    let peer = root.join("peer");
    let _ = fs::remove_dir_all(&peer);
    let remote = root.join("remote.git");
    assert!(
        Command::new("git")
            .args(["clone", "-q", remote.to_str().unwrap()])
            .arg(&peer)
            .output()
            .unwrap()
            .status
            .success()
    );
    configure(&peer);
    commit_file(&peer, name, content, "peer change");
    assert!(git(&peer, &["push", "-q", "origin", "HEAD:main"]).status.success());
    let _ = fs::remove_dir_all(&peer);
}

#[test]
fn status_reports_branch_upstream_and_clean_tree() {
    let (root, work) = fixture("status");
    let status = sync_status_dir(&work).unwrap();
    assert_eq!(status.branch.as_deref(), Some("main"));
    assert!(!status.detached);
    assert!(status.head.is_some());
    assert!(status.local_branches.contains(&"main".to_string()));
    assert!(status.remote_branches.contains(&"origin/main".to_string()));
    assert_eq!(status.upstream.as_deref(), Some("origin/main"));
    assert!(status.clean);
    assert_eq!((status.staged, status.unstaged, status.untracked), (0, 0, 0));
    assert_eq!((status.ahead, status.behind), (Some(0), Some(0)));
    let _ = fs::remove_dir_all(root);
}

#[test]
fn fetch_updates_last_fetch_and_behind_count() {
    let (root, work) = fixture("fetch");
    peer_commit(&root, "peer.txt", "from peer\n");
    let status = fetch_dir(&work).unwrap();
    assert_eq!(status.behind, Some(1));
    assert!(status.last_fetch.is_some());
    assert!(work.join("peer.txt").exists() || !work.join("peer.txt").exists());
    // Fetch alone never touches the worktree.
    assert!(!work.join("peer.txt").exists());
    let _ = fs::remove_dir_all(root);
}

#[test]
fn dirty_worktree_counts_and_blocks_switch() {
    let (root, work) = fixture("dirty");
    create_branch_dir(&work, "feature", false).unwrap();
    fs::write(work.join("file.txt"), "modified\n").unwrap();
    fs::write(work.join("new.txt"), "untracked\n").unwrap();
    let status = sync_status_dir(&work).unwrap();
    assert!(!status.clean);
    assert_eq!(status.unstaged, 1);
    assert_eq!(status.untracked, 1);
    assert_eq!(switch_branch_dir(&work, "feature").unwrap_err(), "GIT_DIRTY");
    assert_eq!(create_branch_dir(&work, "other", true).unwrap_err(), "GIT_DIRTY");
    // Creating without switching never touches the worktree, so it is allowed.
    assert!(create_branch_dir(&work, "other", false).is_ok());
    let _ = fs::remove_dir_all(root);
}

#[test]
fn staged_changes_are_counted() {
    let (root, work) = fixture("staged");
    fs::write(work.join("file.txt"), "staged edit\n").unwrap();
    assert!(git(&work, &["add", "file.txt"]).status.success());
    let status = sync_status_dir(&work).unwrap();
    assert!(!status.clean);
    assert_eq!(status.staged, 1);
    let _ = fs::remove_dir_all(root);
}

#[test]
fn create_switch_and_unknown_branch_rules() {
    let (root, work) = fixture("branches");
    let status = create_branch_dir(&work, "feature", true).unwrap();
    assert_eq!(status.branch.as_deref(), Some("feature"));
    assert_eq!(switch_branch_dir(&work, "main").unwrap().branch.as_deref(), Some("main"));
    assert_eq!(
        create_branch_dir(&work, "feature", false).unwrap_err(),
        "GIT_BRANCH_EXISTS"
    );
    assert_eq!(
        switch_branch_dir(&work, "nope").unwrap_err(),
        "GIT_BRANCH_NOT_FOUND"
    );
    assert_eq!(
        create_branch_dir(&work, "bad name", false).unwrap_err(),
        "GIT_INVALID_BRANCH"
    );
    assert_eq!(
        create_branch_dir(&work, "", false).unwrap_err(),
        "GIT_INVALID_BRANCH"
    );
    let _ = fs::remove_dir_all(root);
}

#[test]
fn fast_forward_pull_applies_remote_commits() {
    let (root, work) = fixture("ff");
    peer_commit(&root, "peer.txt", "from peer\n");
    fetch_dir(&work).unwrap();
    let status = pull_ff_dir(&work).unwrap();
    assert_eq!((status.ahead, status.behind), (Some(0), Some(0)));
    assert_eq!(fs::read_to_string(work.join("peer.txt")).unwrap(), "from peer\n");
    let _ = fs::remove_dir_all(root);
}

#[test]
fn diverged_pull_is_rejected_without_touching_worktree() {
    let (root, work) = fixture("diverged");
    commit_file(&work, "file.txt", "local\n", "local change");
    peer_commit(&root, "peer.txt", "from peer\n");
    fetch_dir(&work).unwrap();
    let before = sync_status_dir(&work).unwrap();
    assert_eq!(before.ahead, Some(1));
    assert_eq!(before.behind, Some(1));
    assert_eq!(pull_ff_dir(&work).unwrap_err(), "GIT_DIVERGED");
    // The rejected pull leaves the worktree exactly as it was.
    assert_eq!(fs::read_to_string(work.join("file.txt")).unwrap(), "local\n");
    let _ = fs::remove_dir_all(root);
}

#[test]
fn push_without_upstream_then_set_upstream() {
    let (root, work) = fixture("push");
    create_branch_dir(&work, "feature", true).unwrap();
    commit_file(&work, "feat.txt", "work\n", "feature work");
    let status = sync_status_dir(&work).unwrap();
    assert_eq!(status.upstream, None);
    assert_eq!((status.ahead, status.behind), (None, None));
    assert_eq!(push_dir(&work, "origin", false).unwrap_err(), "GIT_NO_UPSTREAM");
    let status = push_dir(&work, "origin", true).unwrap();
    assert_eq!(status.upstream.as_deref(), Some("origin/feature"));
    commit_file(&work, "feat2.txt", "more\n", "more work");
    assert_eq!(sync_status_dir(&work).unwrap().ahead, Some(1));
    let status = push_dir(&work, "origin", false).unwrap();
    assert_eq!((status.ahead, status.behind), (Some(0), Some(0)));
    let _ = fs::remove_dir_all(root);
}

#[test]
fn push_rejected_when_remote_is_ahead() {
    let (root, work) = fixture("rejected");
    commit_file(&work, "file.txt", "local\n", "local change");
    peer_commit(&root, "peer.txt", "from peer\n");
    fetch_dir(&work).unwrap();
    assert_eq!(push_dir(&work, "origin", false).unwrap_err(), "GIT_PUSH_REJECTED");
    let _ = fs::remove_dir_all(root);
}

#[test]
fn detached_head_reports_sha_and_refuses_branch_ops() {
    let (root, work) = fixture("detached");
    let sha = {
        let out = git(&work, &["rev-parse", "HEAD"]);
        String::from_utf8_lossy(&out.stdout).trim().to_string()
    };
    assert!(git(&work, &["checkout", "-q", &sha]).status.success());
    let status = sync_status_dir(&work).unwrap();
    assert!(status.detached);
    assert_eq!(status.branch, None);
    assert!(status.head.is_some());
    assert_eq!(push_dir(&work, "origin", false).unwrap_err(), "GIT_DETACHED");
    assert_eq!(pull_ff_dir(&work).unwrap_err(), "GIT_DETACHED");
    // Coming back to a branch works on a clean tree.
    assert_eq!(
        switch_branch_dir(&work, "main").unwrap().branch.as_deref(),
        Some("main")
    );
    let _ = fs::remove_dir_all(root);
}

#[test]
fn non_git_directory_is_rejected() {
    let root = temp_root("nogit");
    assert_eq!(
        sync_status_dir(&root).unwrap_err(),
        "GIT_NOT_GIT"
    );
    let _ = fs::remove_dir_all(root);
}

#[test]
fn concurrent_status_reads_are_consistent() {
    let (root, work) = fixture("concurrent");
    let handles: Vec<_> = (0..8)
        .map(|_| {
            let dir = work.clone();
            std::thread::spawn(move || sync_status_dir(&dir).unwrap().branch)
        })
        .collect();
    for handle in handles {
        assert_eq!(handle.join().unwrap().as_deref(), Some("main"));
    }
    let _ = fs::remove_dir_all(root);
}
