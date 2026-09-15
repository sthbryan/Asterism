use std::collections::BTreeMap;

use serde_json::Value;

use crate::gh::{run_gh_env, run_gh_json};
use crate::models::{PullChecks, PullFile, PullListResult, PullRequestDetail, PullRequestSummary};

pub const MAX_LIST_LIMIT: u8 = 100;
pub const MAX_FILES: usize = 100;
pub const MAX_DIFF_CHARS: usize = 200 * 1024;
pub const MAX_REPOS_PER_REFRESH: usize = 100;
pub const MAX_REQUESTS_PER_REFRESH: usize = 100;
pub const MAX_PAGE: u32 = 1000;
pub const MAX_PAGE_SIZE: u8 = 100;

#[derive(Debug, Clone, Default, serde::Serialize, serde::Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PullRequestFilters {
    #[serde(default)]
    pub repos: Vec<String>,
    #[serde(default)]
    pub repo: Option<String>,
    #[serde(default)]
    pub author: Option<String>,
    #[serde(default)]
    pub assignee: Option<String>,
    #[serde(default)]
    pub review_requested: Option<String>,
    #[serde(default)]
    pub state: Option<String>,
}

impl PullRequestFilters {
    pub fn normalized(mut self) -> Self {
        for value in [
            &mut self.repo,
            &mut self.author,
            &mut self.assignee,
            &mut self.review_requested,
            &mut self.state,
        ] {
            *value = value
                .take()
                .map(|s| s.trim().to_string())
                .filter(|s| !s.is_empty());
        }
        self.repos = self
            .repos
            .into_iter()
            .map(|s| s.trim().to_string())
            .filter(|s| !s.is_empty())
            .collect();
        if let Some(state) = self.state.as_mut() {
            *state = state.to_ascii_lowercase();
            if state == "merged" {
                
                
                *state = "merged".into();
            }
        }
        self
    }
}

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

pub(crate) fn parse_summary(repo: &str, value: &Value) -> Option<PullRequestSummary> {
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

pub(crate) fn parse_detail(repo: &str, value: &Value) -> Option<PullRequestDetail> {
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

const SUMMARY_FIELDS: &str = "number,title,author,headRefName,baseRefName,isDraft,state,createdAt,updatedAt,mergedAt,url,additions,deletions,changedFiles,reviewDecision,statusCheckRollup,reviews,assignees,reviewRequests";

const DETAIL_FIELDS: &str = "number,title,author,headRefName,baseRefName,isDraft,state,createdAt,updatedAt,mergedAt,url,additions,deletions,changedFiles,reviewDecision,statusCheckRollup,reviews,assignees,reviewRequests,body,mergeable,mergeStateStatus,files";

pub fn list_repo_pulls_state(
    repo: &str,
    limit: u8,
    state: Option<&str>,
) -> (Vec<PullRequestSummary>, Option<String>) {
    let limit = limit.clamp(1, MAX_LIST_LIMIT);
    let state = match state.unwrap_or("all").to_ascii_lowercase().as_str() {
        "open" | "closed" | "all" => state.unwrap_or("all"),
        "merged" => "all",
        _ => "all",
    };
    let args = [
        "pr",
        "list",
        "--repo",
        repo,
        "--state",
        state,
        "--limit",
        &limit.to_string(),
        "--json",
        SUMMARY_FIELDS,
    ];

    let json = match run_gh_json(&args) {
        Ok(json) => json,
        Err(err) => return (Vec::new(), Some(err)),
    };
    let items = json.as_array().cloned().unwrap_or_default();
    let pulls = items
        .iter()
        .filter_map(|item| parse_summary(repo, item))
        .collect();
    (pulls, None)
}

pub fn matches_filters(pull: &PullRequestSummary, filters: &PullRequestFilters) -> bool {
    let f = filters.clone().normalized();
    if !f.repos.is_empty()
        && !f
            .repos
            .iter()
            .any(|repo| repo.eq_ignore_ascii_case(&pull.repo))
    {
        return false;
    }
    let contains = |value: Option<&String>, wanted: &Option<String>| match wanted.as_ref() {
        None => true,
        Some(want) => value.is_some_and(|actual| actual.eq_ignore_ascii_case(want)),
    };
    if !contains(Some(&pull.repo), &f.repo) || !contains(pull.author.as_ref(), &f.author) {
        return false;
    }
    if let Some(want) = f.assignee {
        if !pull
            .assignees
            .iter()
            .any(|actual| actual.eq_ignore_ascii_case(&want))
        {
            return false;
        }
    }
    if let Some(want) = f.review_requested {
        if !pull
            .review_requests
            .iter()
            .any(|actual| actual.eq_ignore_ascii_case(&want))
        {
            return false;
        }
    }
    if let Some(want) = f.state {
        if want == "merged" {
            
            
            if pull.state != "MERGED" {
                return false;
            }
        } else if want != "all" && !pull.state.eq_ignore_ascii_case(&want) {
            return false;
        }
    }
    true
}

pub fn paginate(
    mut pulls: Vec<PullRequestSummary>,
    errors: BTreeMap<String, String>,
    fetched_at: u64,
    filters: &PullRequestFilters,
    page: u32,
    per_page: u8,
) -> PullListResult {
    let filters = filters.clone().normalized();
    pulls.retain(|pull| matches_filters(pull, &filters));
    pulls.sort_by(|a, b| {
        b.updated_at
            .cmp(&a.updated_at)
            .then_with(|| a.repo.cmp(&b.repo))
            .then_with(|| b.number.cmp(&a.number))
    });
    let total = pulls.len() as u64;
    let page = page.clamp(1, MAX_PAGE);
    let per_page = per_page.clamp(1, MAX_PAGE_SIZE);
    let start = ((page - 1) as usize).saturating_mul(per_page as usize);
    let end = start.saturating_add(per_page as usize).min(pulls.len());
    let selected = if start >= pulls.len() {
        Vec::new()
    } else {
        pulls[start..end].to_vec()
    };
    PullListResult {
        pulls: selected,
        errors,
        fetched_at,
        page,
        per_page,
        total,
        has_next_page: end < pulls.len(),
    }
}

pub fn pull_detail(repo: &str, number: u64) -> Result<PullRequestDetail, String> {
    let num = number.to_string();
    let json = run_gh_json(&["pr", "view", &num, "--repo", repo, "--json", DETAIL_FIELDS])?;
    parse_detail(repo, &json).ok_or_else(|| "GitHub did not return that pull request.".to_string())
}

pub fn pull_diff(repo: &str, number: u64) -> Result<String, String> {
    let num = number.to_string();
    let diff = run_gh_env(
        &["pr", "diff", &num, "--repo", repo],
        &[("GH_PROMPT_DISABLED", "1")],
    )?;
    Ok(cap_diff(diff))
}

fn cap_diff(mut diff: String) -> String {
    if diff.len() > MAX_DIFF_CHARS {
        let mut end = MAX_DIFF_CHARS;
        while !diff.is_char_boundary(end) {
            end -= 1;
        }
        diff.truncate(end);
        diff.push_str("\n…(diff truncated at 200 KiB)");
    }
    diff
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

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
}
