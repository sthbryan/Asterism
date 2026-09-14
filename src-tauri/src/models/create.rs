use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseOption {
    pub key: String,
    pub name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateOptions {
    pub owners: Vec<String>,
    pub gitignores: Vec<String>,
    pub licenses: Vec<LicenseOption>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateRepoInput {
    pub owner: String,
    pub name: String,
    pub description: Option<String>,
    pub private: bool,
    pub add_readme: bool,
    pub gitignore: Option<String>,
    pub license: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreatedRepo {
    pub full_name: String,
    pub html_url: String,
    pub private: bool,
}
