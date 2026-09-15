use crate::config;
use crate::history;
use crate::models::{PullListResult, PullRequestDetail, PullRequestSummary};
use crate::pulls;
use crate::pulls::PullRequestFilters;

use super::catalog::ensure_online;
use super::state::ensure_scope;
use super::status::offload;

fn valid_pull_repo(repo: &str) -> bool {
    let mut parts = repo.split('/');
    let owner = parts.next().unwrap_or_default();
    let name = parts.next().unwrap_or_default();
    parts.next().is_none()
        && !owner.is_empty()
        && !name.is_empty()
        && !repo.starts_with('-')
        && !repo.contains("..")
        && repo
            .chars()
            .all(|c| c.is_ascii_alphanumeric() || ".-_/".contains(c))
}

fn normalize_pull_page(page: u32, per_page: u8) -> (u32, u8) {
    (
        page.clamp(1, pulls::MAX_PAGE),
        per_page.clamp(1, pulls::MAX_PAGE_SIZE),
    )
}

fn followed_pull_repos(
    db: &config::Storage<tauri::Wry>,
    requested: Option<&str>,
) -> Result<Vec<String>, String> {
    let repos = db.load_config()?.repos;
    if repos.len() > pulls::MAX_REPOS_PER_REFRESH {
        return Err("PR_REQUEST_LIMIT:too many followed repositories".into());
    }
    if let Some(repo) = requested {
        if !valid_pull_repo(repo) {
            return Err("PR_INVALID_REPOSITORY".into());
        }
        if !repos.iter().any(|name| name.eq_ignore_ascii_case(repo)) {
            return Err("PR_REPOSITORY_NOT_FOLLOWED".into());
        }
        return Ok(vec![repos
            .into_iter()
            .find(|name| name.eq_ignore_ascii_case(repo))
            .unwrap_or_else(|| repo.to_string())]);
    }
    Ok(repos)
}

fn followed_pull_repos_for(
    db: &config::Storage<tauri::Wry>,
    requested: &[String],
) -> Result<Vec<String>, String> {
    if requested.is_empty() {
        return followed_pull_repos(db, None);
    }
    if requested.len() > pulls::MAX_REPOS_PER_REFRESH {
        return Err("PR_REQUEST_LIMIT:too many repositories requested".into());
    }
    let all = db.load_config()?.repos;
    let mut selected = Vec::with_capacity(requested.len());
    for wanted in requested {
        if !valid_pull_repo(wanted) {
            return Err("PR_INVALID_REPOSITORY".into());
        }
        let actual = all
            .iter()
            .find(|name| name.eq_ignore_ascii_case(wanted))
            .ok_or_else(|| format!("PR_REPOSITORY_NOT_FOLLOWED:{wanted}"))?;
        if !selected
            .iter()
            .any(|name: &String| name.eq_ignore_ascii_case(actual))
        {
            selected.push(actual.clone());
        }
    }
    Ok(selected)
}

fn merge_pull_fetches(
    repos: &[String],
    fetches: impl IntoIterator<Item = (String, Vec<PullRequestSummary>, Option<String>)>,
    previous: Option<&PullListResult>,
    fetched_at: u64,
    preserve_outside: bool,
) -> PullListResult {
    let mut pulls = Vec::new();
    let mut errors = std::collections::BTreeMap::new();
    let old = previous.map(|result| &result.pulls);
    for (repo, fresh, error) in fetches {
        if let Some(error) = error {
            errors.insert(repo.clone(), error);
            if let Some(old) = old {
                pulls.extend(
                    old.iter()
                        .filter(|pull| pull.repo.eq_ignore_ascii_case(&repo))
                        .cloned(),
                );
            }
        } else {
            pulls.extend(fresh);
        }
    }

    if preserve_outside {
        if let Some(old) = old {
            let selected = &repos[0];
            pulls.extend(
                old.iter()
                    .filter(|pull| !pull.repo.eq_ignore_ascii_case(selected))
                    .cloned(),
            );
        }
    }
    pulls.sort_by(|a, b| a.repo.cmp(&b.repo).then_with(|| b.number.cmp(&a.number)));
    pulls.dedup_by(|a, b| a.repo.eq_ignore_ascii_case(&b.repo) && a.number == b.number);
    let total = pulls.len() as u64;
    PullListResult {
        pulls,
        errors,
        fetched_at,
        page: 1,
        per_page: pulls::MAX_LIST_LIMIT,
        total,
        has_next_page: false,
    }
}

fn pull_snapshot(
    expected_account: Option<&str>,
    filters: &PullRequestFilters,
) -> Result<config::Saved<PullListResult>, String> {
    ensure_scope(expected_account)?;
    let db = config::storage()?;
    let normalized = filters.clone().normalized();
    let repos = if !normalized.repos.is_empty() {
        followed_pull_repos_for(&db, &normalized.repos)?
    } else {
        followed_pull_repos(&db, normalized.repo.as_deref())?
    };
    if repos.len() > pulls::MAX_REQUESTS_PER_REFRESH {
        return Err("PR_REQUEST_LIMIT:refresh would exceed request limit".into());
    }
    ensure_online()?;
    let state = normalized.state.as_deref();
    let fetches = repos.iter().map(|repo| {
        let (rows, error) = pulls::list_repo_pulls_state(repo, pulls::MAX_LIST_LIMIT, state);
        (repo.clone(), rows, error)
    });
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
        let db = config::storage()?;
        let repo = followed_pull_repos(&db, Some(&repo))?
            .into_iter()
            .next()
            .ok_or_else(|| "PR_REPOSITORY_NOT_FOLLOWED".to_string())?;
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
        let db = config::storage()?;
        let repo = followed_pull_repos(&db, Some(&repo))?
            .into_iter()
            .next()
            .ok_or_else(|| "PR_REPOSITORY_NOT_FOLLOWED".to_string())?;
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
