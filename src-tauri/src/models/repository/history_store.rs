use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SeriesPoint {
    pub ts: u64,
    pub value: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct RepoHistory {
    #[serde(default)]
    pub stars: Vec<SeriesPoint>,
    #[serde(default)]
    pub downloads: Vec<SeriesPoint>,
    #[serde(default)]
    pub forks: Vec<SeriesPoint>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct HistoryStore {
    pub version: u32,
    #[serde(default)]
    pub repos: std::collections::BTreeMap<String, RepoHistory>,
}
