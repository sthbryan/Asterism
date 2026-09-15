use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CatalogRepo {
    pub full_name: String,
    pub owner: String,
    pub name: String,
    pub description: Option<String>,
    pub private: bool,
    pub language: Option<String>,
    pub archived: bool,
    pub fork: bool,
    pub pushed_at: Option<String>,
    pub stars: u64,
    pub forks: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct PlatformDownloads {
    #[serde(default)]
    pub macos: u64,
    #[serde(default)]
    pub windows: u64,
    #[serde(default)]
    pub linux: u64,
    #[serde(default)]
    pub other: u64,
}

impl PlatformDownloads {
    pub fn add(&mut self, name: &str, count: u64) {
        match crate::platform::classify_asset(name) {
            crate::platform::Platform::Macos => self.macos = self.macos.saturating_add(count),
            crate::platform::Platform::Windows => self.windows = self.windows.saturating_add(count),
            crate::platform::Platform::Linux => self.linux = self.linux.saturating_add(count),
            crate::platform::Platform::Other => self.other = self.other.saturating_add(count),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TrackedRepo {
    #[serde(default)]
    pub fetched_at: Option<u64>,
    pub full_name: String,
    pub description: Option<String>,
    pub private: bool,
    pub language: Option<String>,
    pub stars: u64,
    pub forks: u64,
    pub downloads: u64,
    #[serde(default)]
    pub platforms: PlatformDownloads,
    #[serde(default)]
    pub stars_delta: Option<i64>,
    #[serde(default)]
    pub forks_delta: Option<i64>,
    #[serde(default)]
    pub downloads_delta: Option<i64>,
    pub error: Option<String>,
}

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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Cache {
    pub fetched_at: u64,
    pub repos: Vec<TrackedRepo>,
    #[serde(default)]
    pub history: std::collections::BTreeMap<String, RepoHistory>,
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
    fn default() -> Self { Self::Unavailable }
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
