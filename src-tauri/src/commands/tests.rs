use std::collections::HashMap;

use crate::models::{Traffic, TrafficStatus, TrackedRepo};

use super::catalog::merge_cached_traffic;
use super::state::merge_fetches;

#[cfg(test)]
mod offline_tests {
    use super::*;
    fn traffic(fetched_at: u64, sample_from: u64, sample_to: u64) -> Traffic {
        Traffic {
            count: 4,
            uniques: 2,
            days: vec![],
            fetched_at: Some(fetched_at),
            sample_from: Some(sample_from),
            sample_to: Some(sample_to),
        }
    }
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
    fn total_failure_does_not_produce_replacement_cache() {
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

    #[test]
    fn failed_views_use_cached_metadata_while_fresh_clones_stay() {
        let mut views = None;
        let mut views_status = TrafficStatus::Forbidden;
        let mut cached_views = Some(traffic(100, 10, 20));
        let fresh_clones = Some(traffic(500, 30, 40));
        let mut clones = fresh_clones.clone();
        let mut clones_status = TrafficStatus::Ok;
        let mut cached_clones = Some(traffic(100, 10, 20));
        merge_cached_traffic(&mut views, &mut views_status, &mut cached_views);
        merge_cached_traffic(&mut clones, &mut clones_status, &mut cached_clones);
        assert_eq!(views.unwrap().fetched_at, Some(100));
        assert_eq!(views_status, TrafficStatus::Forbidden);
        assert_eq!(clones.unwrap().fetched_at, fresh_clones.unwrap().fetched_at);
        assert!(cached_clones.is_some());
    }

    #[test]
    fn missing_cache_keeps_permission_status_and_auxiliary_error_does_not_replace_fresh_data() {
        let mut views = None;
        let mut status = TrafficStatus::Forbidden;
        let mut no_cache = None;
        merge_cached_traffic(&mut views, &mut status, &mut no_cache);
        assert!(views.is_none());
        assert_eq!(status, TrafficStatus::Forbidden);

        let mut fresh = Some(traffic(500, 30, 40));
        let mut saved = Some(traffic(100, 10, 20));
        let mut fresh_status = TrafficStatus::Ok;
        merge_cached_traffic(&mut fresh, &mut fresh_status, &mut saved);
        assert_eq!(fresh.unwrap().fetched_at, Some(500));
        assert!(saved.is_some());
    }
}
