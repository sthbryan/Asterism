use super::history_store::SeriesPoint;
use super::tracked::PlatformDownloads;
use super::traffic::{PopularPath, Referrer, Traffic, TrafficStatus};
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct LocalCheckout {
    pub full_name: String,
    pub path: String,
    pub status: String,
    pub branch: Option<String>,
    pub remote_url: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LanguageShare {
    pub name: String,
    pub bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Asset {
    pub name: String,
    pub download_count: u64,
    pub size: u64,
    pub content_type: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Release {
    pub tag: String,
    pub name: Option<String>,
    pub published_at: Option<String>,
    pub draft: bool,
    pub prerelease: bool,
    pub downloads: u64,
    pub assets: Vec<Asset>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RepoDetail {
    pub full_name: String,
    pub description: Option<String>,
    pub homepage: Option<String>,
    pub private: bool,
    pub visibility: Option<String>,
    pub archived: bool,
    pub is_template: bool,
    pub language: Option<String>,
    pub languages: Vec<LanguageShare>,
    pub stars: u64,
    pub forks: u64,
    pub watchers: u64,
    pub open_issues: u64,
    pub network_count: u64,
    pub size: u64,
    pub license: Option<String>,
    pub default_branch: Option<String>,
    pub topics: Vec<String>,
    pub created_at: Option<String>,
    pub updated_at: Option<String>,
    pub pushed_at: Option<String>,
    pub downloads: u64,
    pub views: Option<Traffic>,
    pub clones: Option<Traffic>,
    pub traffic_error: Option<String>,
    #[serde(default)]
    pub views_status: TrafficStatus,
    #[serde(default)]
    pub clones_status: TrafficStatus,
    pub releases: Vec<Release>,
    #[serde(default)]
    pub platforms: PlatformDownloads,
    #[serde(default)]
    pub referrers: Vec<Referrer>,
    #[serde(default)]
    pub paths: Vec<PopularPath>,
    #[serde(default)]
    pub star_history: Vec<SeriesPoint>,
    #[serde(default)]
    pub download_history: Vec<SeriesPoint>,
}
