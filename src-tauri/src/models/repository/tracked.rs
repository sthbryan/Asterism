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
