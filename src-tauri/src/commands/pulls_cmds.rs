use std::collections::BTreeMap;

use crate::config;
use crate::history;
use crate::models::{PullListResult, PullRequestDetail};
use crate::pulls;
use crate::pulls::PullRequestFilters;

use super::catalog::ensure_online;
use super::pull_helpers::{
    followed_pull_repos, followed_pull_repos_for, merge_pull_fetches, normalize_pull_page,
    valid_pull_repo,
};
use super::state::ensure_scope;
use super::status::offload;

fn pull_snapshot(
    expected_account: Option<&str>,
    filters: &PullRequestFilters,
) -> Result<config::Saved<PullListResult>, String> {
    let normalized = filters.clone().normalized();
    let repos = config::serialized_write(|| {
        ensure_scope(expected_account)?;
        let db = config::storage()?;
        if !normalized.repos.is_empty() {
            followed_pull_repos_for(&db, &normalized.repos)
        } else {
            followed_pull_repos(&db, normalized.repo.as_deref())
        }
    })?;
    if repos.len() > pulls::MAX_REQUESTS_PER_REFRESH {
        return Err("PR_REQUEST_LIMIT:refresh would exceed request limit".into());
    }
    ensure_online()?;
    let state = normalized.state.clone();
    let fetches = pulls::list_pulls(
        &repos,
        pulls::MAX_LIST_LIMIT,
        state.as_deref(),
        &BTreeMap::new(),
    );
    let now = history::now_secs();
    let result = merge_pull_fetches(
        &repos,
        fetches,
        None,
        now,
        !normalized.repos.is_empty() || normalized.repo.is_some(),
    );
    Ok(config::Saved {
        fetched_at: result.fetched_at,
        data: result,
        warning: None,
    })
}

#[tauri::command]
pub(crate) async fn refresh_pull_requests(
    filters: PullRequestFilters,
    expected_account: Option<String>,
) -> Result<config::Saved<PullListResult>, String> {
    offload(move || pull_snapshot(expected_account.as_deref(), &filters)).await?
}

#[tauri::command]
pub(crate) async fn list_pull_requests(
    repos: Vec<String>,
    _limit: u8,
    expected_account: Option<String>,
) -> Result<PullListResult, String> {
    offload(move || {
        ensure_scope(expected_account.as_deref())?;
        let filters = PullRequestFilters {
            repos,
            ..Default::default()
        };
        Ok(pull_snapshot(expected_account.as_deref(), &filters)?.data)
    })
    .await?
}

#[tauri::command]
pub(crate) async fn load_more_pull_requests(
    filters: PullRequestFilters,
    cursors: BTreeMap<String, String>,
    expected_account: Option<String>,
) -> Result<PullListResult, String> {
    offload(move || {
        if cursors.len() > pulls::MAX_REQUESTS_PER_REFRESH {
            return Err("PR_REQUEST_LIMIT:too many cursors".into());
        }
        if cursors.is_empty() {
            return Ok(PullListResult {
                fetched_at: history::now_secs(),
                page: 1,
                per_page: pulls::MAX_LIST_LIMIT,
                ..Default::default()
            });
        }
        let normalized = filters.clone().normalized();
        let requested: Vec<String> = cursors.keys().cloned().collect();
        let repos = config::serialized_write(|| {
            ensure_scope(expected_account.as_deref())?;
            followed_pull_repos_for(&config::storage()?, &requested)
        })?;
        ensure_online()?;
        let state = normalized.state.clone();
        let pages = pulls::list_pulls(&repos, pulls::MAX_LIST_LIMIT, state.as_deref(), &cursors);
        Ok(merge_pull_fetches(
            &repos,
            pages,
            None,
            history::now_secs(),
            false,
        ))
    })
    .await?
}

#[tauri::command]
pub(crate) async fn list_pull_requests_filtered(
    filters: PullRequestFilters,
    page: u32,
    per_page: u8,
    expected_account: Option<String>,
) -> Result<PullListResult, String> {
    let repos = filters.repos.clone();
    let limit = pulls::MAX_LIST_LIMIT;
    let result = list_pull_requests(repos, limit, expected_account).await?;
    let (page, per_page) = normalize_pull_page(page, per_page);
    Ok(pulls::paginate(
        result.pulls,
        result.errors,
        result.fetched_at,
        &filters,
        page,
        per_page,
    ))
}

#[tauri::command]
pub(crate) async fn get_pull_request_detail(
    repo: String,
    number: u64,
    expected_account: Option<String>,
) -> Result<config::Saved<PullRequestDetail>, String> {
    offload(move || {
        ensure_scope(expected_account.as_deref())?;
        if !valid_pull_repo(&repo) || number == 0 {
            return Err("PR_INVALID_REQUEST".into());
        }
        let repo = config::serialized_write(|| {
            ensure_scope(expected_account.as_deref())?;
            followed_pull_repos(&config::storage()?, Some(&repo))?
                .into_iter()
                .next()
                .ok_or_else(|| "PR_REPOSITORY_NOT_FOLLOWED".to_string())
        })?;
        ensure_online()?;
        let detail = pulls::pull_detail(&repo, number)?;
        Ok(config::Saved {
            fetched_at: history::now_secs(),
            data: detail,
            warning: None,
        })
    })
    .await?
}

#[tauri::command]
pub(crate) async fn get_pull_request(
    repo: String,
    number: u64,
    expected_account: Option<String>,
) -> Result<config::Saved<PullRequestDetail>, String> {
    get_pull_request_detail(repo, number, expected_account).await
}

#[tauri::command]
pub(crate) async fn get_pull_request_diff(
    repo: String,
    number: u64,
    expected_account: Option<String>,
) -> Result<config::Saved<String>, String> {
    offload(move || {
        ensure_scope(expected_account.as_deref())?;
        if !valid_pull_repo(&repo) || number == 0 {
            return Err("PR_INVALID_REQUEST".into());
        }
        let repo = config::serialized_write(|| {
            ensure_scope(expected_account.as_deref())?;
            followed_pull_repos(&config::storage()?, Some(&repo))?
                .into_iter()
                .next()
                .ok_or_else(|| "PR_REPOSITORY_NOT_FOLLOWED".to_string())
        })?;
        ensure_online()?;
        let diff = pulls::pull_diff(&repo, number)?;
        Ok(config::Saved {
            fetched_at: history::now_secs(),
            data: diff,
            warning: None,
        })
    })
    .await?
}

#[tauri::command]
pub(crate) async fn get_pull_diff(
    repo: String,
    number: u64,
    expected_account: Option<String>,
) -> Result<config::Saved<String>, String> {
    get_pull_request_diff(repo, number, expected_account).await
}
