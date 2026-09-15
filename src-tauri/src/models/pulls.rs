use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub struct PullChecks {
    #[serde(default)]
    pub passing: u32,
    #[serde(default)]
    pub failing: u32,
    #[serde(default)]
    pub pending: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PullRequestSummary {
    pub repo: String,
    pub number: u64,
    pub title: String,
    #[serde(default)]
    pub author: Option<String>,
    #[serde(default)]
    pub head_ref: Option<String>,
    #[serde(default)]
    pub base_ref: Option<String>,
    #[serde(default)]
    pub draft: bool,
    #[serde(default)]
    pub state: String,
    #[serde(default)]
    pub created_at: Option<String>,
    #[serde(default)]
    pub updated_at: Option<String>,
    #[serde(default)]
    pub merged_at: Option<String>,
    #[serde(default)]
    pub url: Option<String>,
    #[serde(default)]
    pub additions: u64,
    #[serde(default)]
    pub deletions: u64,
    #[serde(default)]
    pub changed_files: u64,
    #[serde(default)]
    pub review_decision: Option<String>,
    #[serde(default)]
    pub checks: PullChecks,
    #[serde(default)]
    pub approvals: u32,
    #[serde(default)]
    pub changes_requested: u32,
    #[serde(default)]
    pub assignees: Vec<String>,
    #[serde(default)]
    pub review_requests: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PullFile {
    pub path: String,
    #[serde(default)]
    pub additions: u64,
    #[serde(default)]
    pub deletions: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct PullRequestDetail {
    #[serde(flatten)]
    pub summary: PullRequestSummary,
    #[serde(default)]
    pub body: Option<String>,
    #[serde(default)]
    pub mergeable: Option<String>,
    #[serde(default)]
    pub merge_state: Option<String>,
    #[serde(default)]
    pub files: Vec<PullFile>,

    #[serde(default)]
    pub diff: Option<String>,
    #[serde(default)]
    pub diff_fetched_at: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PullListResult {
    #[serde(default)]
    pub pulls: Vec<PullRequestSummary>,
    #[serde(default)]
    pub errors: std::collections::BTreeMap<String, String>,
    pub fetched_at: u64,
    #[serde(default = "default_page")]
    pub page: u32,
    #[serde(default = "default_per_page")]
    pub per_page: u8,
    #[serde(default)]
    pub total: u64,
    #[serde(default)]
    pub has_next_page: bool,
}

fn default_page() -> u32 {
    1
}

fn default_per_page() -> u8 {
    30
}
