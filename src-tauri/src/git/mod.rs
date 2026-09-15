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

pub mod status;
pub mod ops;
pub mod commands;
pub mod concurrency;

#[allow(unused_imports)]
pub use status::{GitSyncStatus, sync_status_dir};
#[allow(unused_imports)]
pub use ops::{create_branch_dir, fetch_dir, pull_ff_dir, push_dir, switch_branch_dir};
#[allow(unused_imports)]
pub use concurrency::{read_only, serialized_on};
#[allow(unused_imports)]
pub(crate) use commands::{git_create_branch, git_fetch, git_pull, git_push, git_switch_branch, git_sync_status};
