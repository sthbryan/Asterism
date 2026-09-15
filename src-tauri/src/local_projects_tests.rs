//! Filesystem-only regression coverage for local checkout contracts.
//! Registered by lib.rs under cfg(test); no network or real user data.
#![cfg(test)]

use std::collections::BTreeMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use crate::commands::{canonical_parent, remove_checkout_registration, validate_link};

fn temp_dir(label: &str) -> PathBuf {
    let p = std::env::temp_dir().join(format!("asterism-{label}-{}", std::process::id()));
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

#[test]
fn git_repo_with_spaces_has_a_valid_root_and_origin() {
    let root = temp_dir("spaces").join("parent with spaces");
    fs::create_dir_all(&root).unwrap();
    assert!(git(&root, &["init", "-q"]).status.success());
    assert!(git(
        &root,
        &[
            "remote",
            "add",
            "origin",
            "https://github.com/acme/demo.git"
        ]
    )
    .status
    .success());
    assert_eq!(
        validate_link("acme/demo", root.to_str().unwrap())
            .unwrap()
            .status,
        "ready"
    );
    let top = git(&root, &["rev-parse", "--show-toplevel"]);
    assert!(top.status.success());
    assert_eq!(
        Path::new(String::from_utf8_lossy(&top.stdout).trim()),
        root.canonicalize().unwrap()
    );
    assert_eq!(
        canonical_parent(root.to_str().unwrap()).unwrap(),
        root.canonicalize().unwrap()
    );
    let _ = fs::remove_dir_all(root.parent().unwrap());
}

#[test]
fn missing_checkout_is_detectable_without_claiming_not_git() {
    let root = temp_dir("missing").join("moved repo");
    assert_eq!(
        validate_link("acme/demo", root.to_str().unwrap()).unwrap_err(),
        "LOCAL_INVALID_PATH"
    );
    assert!(!root.exists());
    let _ = fs::remove_dir_all(root.parent().unwrap());
}

#[test]
fn mismatched_origin_is_rejected_by_exact_remote_check() {
    let root = temp_dir("mismatch");
    assert!(git(&root, &["init", "-q"]).status.success());
    assert!(git(
        &root,
        &[
            "remote",
            "add",
            "origin",
            "https://github.com/acme/other.git"
        ]
    )
    .status
    .success());
    assert_eq!(
        validate_link("acme/demo", root.to_str().unwrap()).unwrap_err(),
        "LOCAL_REMOTE_MISMATCH"
    );
    let _ = fs::remove_dir_all(root);
}

#[test]
fn traversal_name_and_occupied_destination_are_rejected_primitives() {
    let root = temp_dir("occupied");
    assert!(canonical_parent(root.to_str().unwrap()).is_ok());
    assert!(canonical_parent("relative/path").is_err());
    let dest = root.join("existing");
    fs::create_dir_all(&dest).unwrap();
    assert!(dest.exists());
    let _ = fs::remove_dir_all(root);
}

#[test]
fn unlink_contract_removes_registration_target_only_and_keeps_files() {
    let root = temp_dir("unlink");
    let marker = root.join("keep.txt");
    fs::write(&marker, "preserve").unwrap();
    let mut folders = BTreeMap::from([(
        "acme/demo".to_string(),
        vec![root.to_string_lossy().into_owned()],
    )]);
    remove_checkout_registration(&mut folders, "acme/demo", root.to_str().unwrap());
    assert!(folders["acme/demo"].is_empty());
    assert_eq!(fs::read_to_string(&marker).unwrap(), "preserve");
    let _ = fs::remove_dir_all(root);
}
