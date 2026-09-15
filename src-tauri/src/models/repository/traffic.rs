use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Cache {
    pub fetched_at: u64,
    pub repos: Vec<super::tracked::TrackedRepo>,
    #[serde(default)]
    pub history: std::collections::BTreeMap<String, super::history_store::RepoHistory>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrafficDay {
    pub ts: u64,
    pub count: u64,
    pub uniques: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Traffic {
    pub count: u64,
    pub uniques: u64,
    #[serde(default)]
    pub days: Vec<TrafficDay>,
    #[serde(default)]
    pub fetched_at: Option<u64>,
    #[serde(default)]
    pub sample_from: Option<u64>,
    #[serde(default)]
    pub sample_to: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum TrafficStatus {
    Ok,
    Forbidden,
    Error,
    Unavailable,
}

impl Default for TrafficStatus {
    fn default() -> Self {
        Self::Unavailable
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Referrer {
    pub referrer: String,
    pub count: u64,
    pub uniques: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PopularPath {
    pub path: String,
    pub title: Option<String>,
    pub count: u64,
    pub uniques: u64,
}
