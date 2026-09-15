use super::concurrency::{read_only, serialized_on};
use super::ops::{create_branch_dir, fetch_dir, pull_ff_dir, push_dir, switch_branch_dir};
use super::status::{sync_status_dir, GitSyncStatus};

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
