use std::collections::HashMap;

use super::state::merge_fetches;
use crate::models::TrackedRepo;

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
        assert!(history.repos.get("one/saved").is_none());
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
