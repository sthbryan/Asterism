use std::collections::BTreeMap;
use serde_json::Value;
use crate::models::{PullChecks, PullFile, PullRequestDetail, PullRequestSummary};
use super::MAX_FILES;

fn as_u64(value: &Value, key: &str) -> u64 {
    value
        .get(key)
        .and_then(|v| v.as_u64().or_else(|| v.as_i64().map(|n| n.max(0) as u64)))
        .unwrap_or(0)
}

fn as_bool(value: &Value, key: &str) -> bool {
    value.get(key).and_then(|v| v.as_bool()).unwrap_or(false)
}

fn as_string(value: &Value, key: &str) -> Option<String> {
    value
        .get(key)
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
}

fn login_of(value: &Value) -> Option<String> {
    as_string(value, "login")
}

fn parse_logins(value: &Value, key: &str) -> Vec<String> {
    value
        .get(key)
        .and_then(|v| v.as_array())
        .map(|arr| {
            arr.iter()
                .filter_map(|item| {
                    login_of(item).or_else(|| {
                        item.get("requestedReviewer")
                            .and_then(login_of)
                            .or_else(|| item.get("requested_reviewer").and_then(login_of))
                    })
                })
                .collect()
        })
        .unwrap_or_default()
}

fn parse_checks(value: &Value) -> PullChecks {
    let mut checks = PullChecks {
        passing: 0,
        failing: 0,
        pending: 0,
    };
    let Some(arr) = value
        .get("statusCheckRollup")
        .and_then(|v| v.as_array())
        .or_else(|| value.get("status_check_rollup").and_then(|v| v.as_array()))
        .or_else(|| value.get("commits").and_then(|v| v.as_array()))
    else {
        return checks;
    };
    for item in arr {
        let conclusion = as_string(item, "conclusion").map(|s| s.to_uppercase());
        let state = as_string(item, "status")
            .map(|s| s.to_uppercase())
            .or_else(|| {
                item.get("status")
                    .and_then(|s| as_string(s, "state"))
                    .map(|s| s.to_uppercase())
            })
            .or_else(|| as_string(item, "state").map(|s| s.to_uppercase()));
        match conclusion.as_deref() {
            Some("SUCCESS" | "NEUTRAL" | "SKIPPED") => checks.passing += 1,
            Some("FAILURE" | "TIMED_OUT" | "ACTION_REQUIRED" | "CANCELLED") => checks.failing += 1,
            _ => match state.as_deref() {
                Some("SUCCESS") => checks.passing += 1,
                Some("FAILURE" | "ERROR") => checks.failing += 1,
                _ => checks.pending += 1,
            },
        }
    }
    checks
}

fn parse_reviews(value: &Value) -> (u32, u32) {
    let mut approvals = 0u32;
    let mut changes = 0u32;
    if let Some(arr) = value.get("reviews").and_then(|v| v.as_array()) {
        let mut latest: BTreeMap<String, String> = BTreeMap::new();
        for item in arr {
            let author = item.get("author").and_then(login_of).unwrap_or_default();
            let state = as_string(item, "state")
                .map(|s| s.to_uppercase())
                .unwrap_or_default();
            if !author.is_empty() && !state.is_empty() {
                latest.insert(author, state);
            }
        }
        for state in latest.values() {
            match state.as_str() {
                "APPROVED" => approvals += 1,
                "CHANGES_REQUESTED" => changes += 1,
                _ => {}
            }
        }
    }
    (approvals, changes)
}

pub pub fn parse_summary(repo: &str, value: &Value) -> Option<PullRequestSummary> {
    let number = value.get("number")?.as_u64()?;
    let title = as_string(value, "title").unwrap_or_else(|| format!("PR #{number}"));
    let mut state = as_string(value, "state")
        .map(|s| s.to_uppercase())
        .unwrap_or_else(|| "OPEN".to_string());
    let merged_at = as_string(value, "mergedAt").or_else(|| as_string(value, "merged_at"));
    if merged_at.is_some() {
        state = "MERGED".into();
    }
    let (approvals, changes_requested) = parse_reviews(value);
    Some(PullRequestSummary {
        repo: repo.to_string(),
        number,
        title,
        author: value.get("author").and_then(login_of),
        head_ref: as_string(value, "headRefName").or_else(|| as_string(value, "head_ref")),
        base_ref: as_string(value, "baseRefName").or_else(|| as_string(value, "base_ref")),
        draft: as_bool(value, "isDraft") || as_bool(value, "draft"),
        state,
        created_at: as_string(value, "createdAt").or_else(|| as_string(value, "created_at")),
        updated_at: as_string(value, "updatedAt").or_else(|| as_string(value, "updated_at")),
        merged_at,
        url: as_string(value, "url"),
        additions: as_u64(value, "additions"),
        deletions: as_u64(value, "deletions"),
        changed_files: as_u64(value, "changedFiles").max(as_u64(value, "changed_files")),
        review_decision: as_string(value, "reviewDecision")
            .or_else(|| as_string(value, "review_decision"))
            .map(|s| s.to_uppercase()),
        checks: parse_checks(value),
        approvals,
        changes_requested,
        assignees: parse_logins(value, "assignees"),
        review_requests: parse_logins(value, "reviewRequests")
            .into_iter()
            .chain(parse_logins(value, "review_requests"))
            .collect(),
    })
}

fn parse_files(value: &Value) -> Vec<PullFile> {
    let arr = value
        .get("files")
        .and_then(|v| v.as_array())
        .cloned()
        .unwrap_or_default();
    arr.into_iter()
        .filter_map(|item| {
            let path = as_string(&item, "path")?;
            Some(PullFile {
                path,
                additions: as_u64(&item, "additions"),
                deletions: as_u64(&item, "deletions"),
            })
        })
        .take(MAX_FILES)
        .collect()
}

pub pub fn parse_detail(repo: &str, value: &Value) -> Option<PullRequestDetail> {
    let summary = parse_summary(repo, value)?;
    Some(PullRequestDetail {
        summary,
        body: as_string(value, "body"),
        mergeable: as_string(value, "mergeable").map(|s| s.to_uppercase()),
        merge_state: as_string(value, "mergeStateStatus")
            .or_else(|| as_string(value, "merge_state"))
            .map(|s| s.to_uppercase()),
        files: parse_files(value),
        diff: None,
        diff_fetched_at: None,
    })
}

