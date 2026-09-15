use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Status {
    pub ok: bool,
    pub login: Option<String>,
    pub error: Option<String>,
    pub hint: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub enum ThemePref {
    #[default]
    Dark,
    Light,
    System,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Default)]
#[serde(rename_all = "camelCase")]
pub enum Locale {
    #[default]
    En,
    Es,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Config {
    pub version: u32,
    pub repos: Vec<String>,
    #[serde(default)]
    pub theme: ThemePref,
    #[serde(default)]
    pub transparency: bool,
    #[serde(default)]
    pub locale: Option<Locale>,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            version: 1,
            repos: Vec::new(),
            theme: ThemePref::Dark,
            transparency: false,
            locale: None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Diagnostics {
    pub gh_version: Option<String>,
    pub gh_error: Option<String>,
    pub git_version: Option<String>,
    pub git_error: Option<String>,
    pub config_path: String,
    pub history_path: String,
}
