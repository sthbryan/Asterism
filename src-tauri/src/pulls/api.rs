use std::collections::BTreeMap;
use crate::gh::{run_gh_env, run_gh_json};
use crate::models::{PullListResult, PullRequestDetail, PullRequestSummary};
use super::{PullRequestFilters, MAX_DIFF_CHARS, MAX_LIST_LIMIT, MAX_PAGE, MAX_PAGE_SIZE};
use super::parse::{parse_detail, parse_summary};

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

pub(crate) fn cap_diff(mut diff: String) -> String {
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

