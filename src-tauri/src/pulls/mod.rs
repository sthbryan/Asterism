pub mod parse;
pub mod api;
#[cfg(test)]
mod tests;

#[allow(unused_imports)]
pub use parse::{parse_detail, parse_summary};
#[allow(unused_imports)]
pub use api::{cap_diff, list_repo_pulls_state, matches_filters, paginate, pull_detail, pull_diff};

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
