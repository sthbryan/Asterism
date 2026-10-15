use std::collections::HashMap;

use super::state::merge_fetches;
use crate::models::TrackedRepo;

#[test]
fn git_commands_yield_before_checkout_validation() {
    use crate::git::commands::*;
    use std::future::Future;
    use std::pin::Pin;
    use std::sync::mpsc;
    use std::task::{Context, Waker};

    type GitCommand = Pin<Box<dyn Future<Output = Result<crate::git::GitSyncStatus, String>>>>;
    let (tx, rx) = mpsc::channel();
    let mut worker = None;
    let result = crate::config::serialized_write(|| {
        worker = Some(std::thread::spawn(move || {
            let mut context = Context::from_waker(Waker::noop());
            let mut commands: Vec<GitCommand> = vec![
                Box::pin(git_sync_status("one/repo".into(), "/unused".into(), None)),
                Box::pin(git_fetch("one/repo".into(), "/unused".into(), None)),
                Box::pin(git_pull("one/repo".into(), "/unused".into(), None)),
                Box::pin(git_push("one/repo".into(), "/unused".into(), false, None)),
                Box::pin(git_switch_branch(
                    "one/repo".into(),
                    "/unused".into(),
                    "main".into(),
                    None,
                )),
                Box::pin(git_create_branch(
                    "one/repo".into(),
                    "/unused".into(),
                    "feature".into(),
                    false,
                    None,
                )),
            ];
            let pending: Vec<_> = commands
                .iter_mut()
                .map(|command| command.as_mut().poll(&mut context).is_pending())
                .collect();
            let _ = tx.send(pending);
        }));
        rx.recv_timeout(std::time::Duration::from_secs(2))
    });
    worker.unwrap().join().unwrap();
    assert_eq!(
        result.expect("checkout validation blocked the executor"),
        vec![true; 6]
    );
}

#[test]
fn offload_propagates_worker_panics_and_operation_errors() {
    use super::status::offload;
    let panic = tauri::async_runtime::block_on(offload(|| panic!("worker failed"))).unwrap_err();
    assert!(panic.contains("background task failed"));
    let error = tauri::async_runtime::block_on(offload(|| Err::<(), _>("operation failed")))
        .unwrap()
        .unwrap_err();
    assert_eq!(error, "operation failed");
}

#[cfg(test)]
mod refresh_tests {
    use super::*;
    fn repo(name: &str, error: Option<String>) -> TrackedRepo {
        TrackedRepo {
            full_name: name.into(),
            fetched_at: Some(100),
            description: None,
            private: true,
            language: None,
            stars: 10,
            forks: 2,
            downloads: 40,
            platforms: Default::default(),
            stars_delta: None,
            forks_delta: None,
            downloads_delta: None,
            error,
        }
    }
    #[test]
    fn partial_refresh_keeps_old_values_dates_and_does_not_snapshot_errors() {
        let old = repo("one/saved", None);
        let prev = HashMap::from([(old.full_name.clone(), old)]);
        let mut failed = repo("one/saved", Some("network".into()));
        failed.stars = 0;
        failed.downloads = 0;
        let fetches = vec![
            failed,
            repo("one/new-failure", Some("denied".into())),
            repo("one/fresh", None),
        ];
        let mut history = crate::models::HistoryStore::default();
        let rows = merge_fetches(fetches, &prev, &mut history, 500).unwrap();
        assert_eq!(rows.len(), 2);
        assert_eq!(rows[0].stars, 10);
        assert_eq!(rows[0].downloads, 40);
        assert_eq!(rows[0].fetched_at, Some(100));
        assert_eq!(rows[1].fetched_at, Some(500));
        assert!(!history.repos.contains_key("one/saved"));
        assert!(history.repos.contains_key("one/fresh"));
    }
    #[test]
    fn total_failure_does_not_produce_replacement_snapshot() {
        let mut history = crate::models::HistoryStore::default();
        let result = merge_fetches(
            vec![repo("one/repo", Some("timeout".into()))],
            &HashMap::new(),
            &mut history,
            500,
        );
        assert!(result.is_err());
        assert!(history.repos.is_empty());
    }
}
