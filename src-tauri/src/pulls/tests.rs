use super::api::{cap_diff, matches_filters, paginate};
use super::parse::{parse_detail, parse_summary};
use super::{PullRequestFilters, MAX_DIFF_CHARS, MAX_FILES, MAX_LIST_LIMIT};
use crate::models::{PullChecks, PullRequestSummary};
use serde_json::json;
use std::collections::BTreeMap;

#[test]
fn summary_parses_all_fields_with_latest_review_per_author() {
    let v = json!({
        "number": 42, "title": "Fix login", "state": "open",
        "author": {"login": "octo"},
        "headRefName": "fix", "baseRefName": "main",
        "isDraft": false, "createdAt": "2026-01-01", "updatedAt": "2026-01-02",
        "url": "https://github.com/o/r/pull/42",
        "additions": 10, "deletions": 2, "changedFiles": 3,
        "reviewDecision": "APPROVED",
        "statusCheckRollup": [{"conclusion": "SUCCESS"}, {"conclusion": "FAILURE"}, {"status": "pending"}],
        "reviews": [
            {"author": {"login": "a"}, "state": "CHANGES_REQUESTED"},
            {"author": {"login": "a"}, "state": "APPROVED"},
            {"author": {"login": "b"}, "state": "APPROVED"}
        ],
        "assignees": [{"login": "c"}],
        "reviewRequests": [{"login": "d"}, {"requestedReviewer": {"login": "e"}}]
    });
    let pr = parse_summary("o/r", &v).unwrap();
    assert_eq!(pr.number, 42);
    assert_eq!(pr.author.as_deref(), Some("octo"));
    assert_eq!(pr.state, "OPEN");
    assert_eq!((pr.approvals, pr.changes_requested), (2, 0));
    assert_eq!(
        (pr.checks.passing, pr.checks.failing, pr.checks.pending),
        (1, 1, 1)
    );
    assert_eq!(pr.review_requests, vec!["d", "e"]);
}

#[test]
fn summary_tolerates_minimal_and_snake_case_payloads() {
    let v = json!({"number": 7});
    let pr = parse_summary("o/r", &v).unwrap();
    assert_eq!(pr.title, "PR #7");
    assert_eq!(pr.state, "OPEN");
    assert!(!pr.draft);
    assert_eq!(pr.checks.passing + pr.checks.failing + pr.checks.pending, 0);
    let legacy = json!({
        "number": 8, "head_ref": "f", "base_ref": "main",
        "status_check_rollup": [{"state": "SUCCESS"}]
    });
    let pr = parse_summary("o/r", &legacy).unwrap();
    assert_eq!(pr.head_ref.as_deref(), Some("f"));
    assert_eq!(pr.checks.passing, 1);
}

#[test]
fn summary_requires_a_number() {
    assert!(parse_summary("o/r", &json!({"title": "x"})).is_none());
}

#[test]
fn detail_caps_files_and_normalizes_merge_status() {
    let files: Vec<Value> = (0..150)
        .map(|i| json!({"path": format!("f{i}"), "additions": 1, "deletions": 0}))
        .collect();
    let v = json!({
        "number": 1, "title": "t", "mergeable": "conflicting",
        "mergeStateStatus": "dirty", "files": files, "body": "  hello  "
    });
    let d = parse_detail("o/r", &v).unwrap();
    assert_eq!(d.files.len(), MAX_FILES);
    assert_eq!(d.mergeable.as_deref(), Some("CONFLICTING"));
    assert_eq!(d.body.as_deref(), Some("hello"));
}

#[test]
fn limit_clamp_bounds_are_sane() {
    assert_eq!(0u8.clamp(1, MAX_LIST_LIMIT), 1);
    assert_eq!(200u8.clamp(1, MAX_LIST_LIMIT), MAX_LIST_LIMIT);
}

#[test]
fn pagination_filters_and_sorts_without_losing_partial_errors() {
    let make = |repo: &str, n: u64, updated: &str| PullRequestSummary {
        repo: repo.into(),
        number: n,
        title: format!("PR {n}"),
        author: Some("alice".into()),
        head_ref: None,
        base_ref: None,
        draft: false,
        state: "OPEN".into(),
        created_at: None,
        updated_at: Some(updated.into()),
        merged_at: None,
        url: None,
        additions: 0,
        deletions: 0,
        changed_files: 0,
        review_decision: None,
        checks: PullChecks::default(),
        approvals: 0,
        changes_requested: 0,
        assignees: vec!["bob".into()],
        review_requests: vec!["carol".into()],
    };
    let result = paginate(
        vec![make("o/r", 1, "2026-01-01"), make("o/r", 2, "2026-01-02")],
        BTreeMap::from([(String::from("o/other"), String::from("forbidden"))]),
        55,
        &PullRequestFilters {
            repos: vec!["O/R".into()],
            author: Some("ALICE".into()),
            assignee: Some("bob".into()),
            review_requested: Some("carol".into()),
            ..Default::default()
        },
        1,
        1,
    );
    assert_eq!(result.pulls[0].number, 2);
    assert_eq!(result.total, 2);
    assert!(result.has_next_page);
    assert_eq!(result.errors["o/other"], "forbidden");
}

#[test]
fn diff_limit_never_panics_on_utf8_boundary() {
    let output = cap_diff("é".repeat(MAX_DIFF_CHARS));
    assert!(output.len() > MAX_DIFF_CHARS);
    assert!(output.contains("diff truncated"));
}
