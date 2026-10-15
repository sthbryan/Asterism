use crate::models::{PullListResult, PullRequestSummary};
use crate::{config, pulls};

pub(super) fn valid_pull_repo(repo: &str) -> bool {
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

pub(super) fn normalize_pull_page(page: u32, per_page: u8) -> (u32, u8) {
    (
        page.clamp(1, pulls::MAX_PAGE),
        per_page.clamp(1, pulls::MAX_PAGE_SIZE),
    )
}

pub(super) fn followed_pull_repos(
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

pub(super) fn followed_pull_repos_for(
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

pub(super) fn merge_pull_fetches(
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
