#[cfg(test)]
mod traffic_contract_tests {
    use crate::gh::detail::{parse_traffic, traffic_status};
    use crate::models::{Traffic, TrafficStatus};

    #[test]
    fn uniques_are_period_total_not_daily_sum() {
        let json = serde_json::json!({"count": 9, "uniques": 7,
            "views": [{"timestamp":"2026-09-10T00:00:00Z","count":4,"uniques":3},
                      {"timestamp":"2026-09-11T00:00:00Z","count":5,"uniques":3}]});
        let t = parse_traffic(&json, "views");
        assert_eq!(t.uniques, 7);
        assert_eq!(t.days.iter().map(|d| d.uniques).sum::<u64>(), 6);
        assert!(t.sample_from.is_some() && t.sample_to.is_some());
    }

    #[test]
    fn legacy_traffic_deserializes_without_metadata() {
        let t: Traffic =
            serde_json::from_value(serde_json::json!({"count": 2, "uniques": 1, "days": []}))
                .unwrap();
        assert_eq!(t.fetched_at, None);
        assert_eq!(t.sample_from, None);
    }

    #[test]
    fn status_distinguishes_forbidden_from_other_errors() {
        assert_eq!(
            traffic_status("HTTP 403: Forbidden"),
            TrafficStatus::Forbidden
        );
        assert_eq!(traffic_status("network timeout"), TrafficStatus::Error);
    }
}

#[cfg(test)]
mod create_tests {
    use crate::gh::create::{create_repo, validate_repo_name};
    use crate::gh::process::first_line;
    use crate::gh::tool_version;
    use crate::models::CreateRepoInput;

    #[test]
    fn repository_names_reject_paths_and_reserved_names() {
        for name in ["", ".", "..", "repo.git", "owner/repo", "a b", "é", "a\\b"] {
            assert!(validate_repo_name(name).is_err(), "{name}");
        }
        assert!(validate_repo_name(&"a".repeat(101)).is_err());
        for name in ["my-project", ".github", "project_2.0"] {
            assert!(validate_repo_name(name).is_ok(), "{name}");
        }
    }

    #[test]
    fn unsafe_owner_is_rejected_before_running_gh() {
        let result = create_repo(CreateRepoInput {
            owner: "--help".into(),
            name: "test".into(),
            description: None,
            private: true,
            add_readme: true,
            gitignore: None,
            license: None,
        });
        assert_eq!(result.unwrap_err(), "Invalid repository owner.");
    }

    #[test]
    fn missing_tool_reports_technical_error_without_failing() {
        let (version, error) = tool_version("asterism-definitely-missing-binary", &["--version"]);
        assert_eq!(version, None);
        assert!(error.unwrap().contains("was not found"));
    }

    #[test]
    fn first_line_trims_to_a_single_line() {
        assert_eq!(
            first_line("gh version 2.74.2 (2025-01-01)\nmore"),
            "gh version 2.74.2 (2025-01-01)"
        );
        assert_eq!(first_line("  \n"), "");
    }
}
