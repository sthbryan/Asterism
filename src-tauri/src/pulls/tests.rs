use super::api::{cap_diff, paginate};
use super::graphql::{combine, list_query, parse_list};
use super::parse::{parse_detail, parse_summary};
use super::{
    PullPage, PullRequestFilters, MAX_DIFF_CHARS, MAX_FILES, MAX_LIST_LIMIT, REQUEST_ERROR,
};
use crate::models::{PullChecks, PullRequestSummary};
use serde_json::{json, Value};
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
    assert!(result.cursors.is_empty());
    assert_eq!(result.errors["o/other"], "forbidden");
}

#[test]
fn diff_limit_never_panics_on_utf8_boundary() {
    let output = cap_diff("é".repeat(MAX_DIFF_CHARS));
    assert!(output.truncated);
    assert!(output.text.len() <= MAX_DIFF_CHARS);
}

#[test]
fn oversized_diffs_stop_on_a_complete_line() {
    let line = "+ a line of a very large generated file\n";
    let output = cap_diff(line.repeat(MAX_DIFF_CHARS / line.len() + 1));
    assert!(output.truncated);
    assert!(output.text.len() <= MAX_DIFF_CHARS);
    assert!(output.text.ends_with('\n'));
}

#[test]
fn small_diffs_arrive_intact() {
    let diff = "diff --git a/x b/x\n+added\n".to_string();
    let output = cap_diff(diff.clone());
    assert!(!output.truncated);
    assert_eq!(output.text, diff);
}

fn list_repos() -> Vec<String> {
    vec!["one/alpha".into(), "two/beta".into()]
}

#[test]
fn one_document_asks_for_every_repository_without_extra_launches() {
    let query = list_query(&list_repos(), 100, None, &BTreeMap::new());
    assert!(query.contains("r0: repository(owner: \"one\", name: \"alpha\")"));
    assert!(query.contains("r1: repository(owner: \"two\", name: \"beta\")"));
    assert!(
        query.contains("pullRequests(first: 100, orderBy: {field: UPDATED_AT, direction: DESC})")
    );
    assert!(query.contains("fragment PR on PullRequest"));
    assert!(!query.contains("states:"));
}

#[test]
fn state_filter_and_limit_are_bounded() {
    let query = list_query(&list_repos(), 250, Some("OPEN"), &BTreeMap::new());
    assert!(query.contains("states: OPEN, first: 100"));
    let merged = list_query(&list_repos(), 30, Some("merged"), &BTreeMap::new());
    assert!(merged.contains("states: MERGED, first: 30"));
    assert!(!list_query(&list_repos(), 30, Some("all"), &BTreeMap::new()).contains("states:"));
}

#[test]
fn a_cursor_continues_only_its_own_repository() {
    let cursors = BTreeMap::from([(String::from("one/alpha"), String::from("Y3Vyc29y"))]);
    let query = list_query(&list_repos(), 100, None, &cursors);
    let alpha = query
        .split("r1:")
        .next()
        .expect("the first fragment is present");
    assert!(alpha.contains("after: \"Y3Vyc29y\", first: 100"));
    assert!(!query.contains("r1: repository(owner: \"two\", name: \"beta\") { pullRequests(after:"));
    assert!(query.contains("pageInfo {hasNextPage endCursor}"));
}

#[test]
fn unusable_repository_names_never_reach_the_document() {
    let query = list_query(
        &["no-slash".into(), "a/b/c".into(), "ok/name".into()],
        10,
        None,
        &BTreeMap::new(),
    );
    assert!(query.contains("r2: repository(owner: \"ok\", name: \"name\")"));
    assert!(!query.contains("no-slash"));
    assert!(!query.contains("a/b"));
}

#[test]
fn list_payload_is_flattened_into_summaries_per_repository() {
    let json = json!({
        "data": {
            "r0": { "pullRequests": { "nodes": [{
                "number": 5,
                "title": "Speed things up",
                "author": { "login": "octo" },
                "headRefName": "perf",
                "baseRefName": "main",
                "state": "OPEN",
                "updatedAt": "2026-10-10T10:00:00Z",
                "statusCheckRollup": { "contexts": { "nodes": [
                    { "conclusion": "SUCCESS", "status": "COMPLETED" },
                    { "state": "FAILURE" },
                    { "state": "PENDING" }
                ]}},
                "assignees": { "nodes": [{ "login": "a" }] },
                "reviewRequests": { "nodes": [
                    { "requestedReviewer": { "login": "b" } }
                ]}
            }]}}
        },
        "errors": [{ "path": ["r1"], "message": "Could not resolve to a Repository." }]
    });
    let rows = parse_list(&list_repos(), &json);
    assert_eq!(rows.len(), 2);
    let page = &rows[0];
    assert_eq!(page.repo, "one/alpha");
    assert!(page.error.is_none());
    let pull = &page.pulls[0];
    assert_eq!(pull.repo, "one/alpha");
    assert_eq!(pull.number, 5);
    assert_eq!(pull.state, "OPEN");
    assert_eq!(
        (
            pull.checks.passing,
            pull.checks.failing,
            pull.checks.pending
        ),
        (1, 1, 1)
    );
    assert_eq!(pull.assignees, vec!["a"]);
    assert_eq!(pull.review_requests, vec!["b"]);
    assert!(page.next_cursor.is_none());
    let page = &rows[1];
    assert!(page.pulls.is_empty());
    assert_eq!(
        page.error.as_deref(),
        Some("Could not resolve to a Repository.")
    );
}

#[test]
fn a_repository_with_more_pages_reports_its_end_cursor() {
    let json = json!({"data": {"r0": {"pullRequests": {
        "pageInfo": {"hasNextPage": true, "endCursor": "abc123"},
        "nodes": [{"number": 1, "title": "one"}]
    }}}});
    let rows = parse_list(&list_repos(), &json);
    assert_eq!(rows[0].next_cursor.as_deref(), Some("abc123"));
    assert!(rows[1].next_cursor.is_none());
}

#[test]
fn missing_repository_data_is_an_error_only_for_that_repository() {
    let json = json!({"data": {"r0": {"pullRequests": {"nodes": []}}}});
    let rows = parse_list(&list_repos(), &json);
    assert!(rows[0].error.is_none());
    assert!(rows[0].pulls.is_empty());
    assert_eq!(
        rows[1].error.as_deref(),
        Some("GitHub did not return pull requests for that repository.")
    );
}

#[test]
fn nodes_without_a_number_are_skipped_instead_of_failing_the_repository() {
    let json = json!({"data": {"r0": {"pullRequests": {"nodes": [
        {"title": "no number"},
        {"number": 9, "title": "ok"}
    ]}}}});
    let rows = parse_list(&list_repos(), &json);
    assert_eq!(rows[0].pulls.len(), 1);
    assert_eq!(rows[0].pulls[0].number, 9);
}

#[test]
fn a_failed_batch_only_marks_its_own_repositories() {
    let ok = PullPage {
        repo: "one/alpha".into(),
        pulls: Vec::new(),
        error: None,
        next_cursor: None,
    };
    let pages = combine(vec![
        (vec!["one/alpha".into()], Ok(vec![ok])),
        (
            vec!["two/beta".into(), "two/gamma".into()],
            Err("timeout".into()),
        ),
    ]);
    assert_eq!(pages.len(), 3);
    assert!(pages[0].error.is_none());
    assert_eq!(pages[1].repo, "two/beta");
    assert_eq!(pages[1].error.as_deref(), Some("timeout"));
    assert_eq!(pages[2].repo, "two/gamma");
}

#[test]
fn every_failed_batch_collapses_into_one_request_error() {
    let pages = combine(vec![
        (
            vec!["one/alpha".into()],
            Err("Could not parse gh JSON".into()),
        ),
        (
            vec!["two/beta".into()],
            Err("Could not parse gh JSON".into()),
        ),
    ]);
    assert_eq!(pages.len(), 1);
    assert_eq!(pages[0].repo, REQUEST_ERROR);
    assert_eq!(pages[0].error.as_deref(), Some("Could not parse gh JSON"));
}
