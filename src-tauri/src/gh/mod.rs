use serde_json::Value;

mod catalog;
mod create;
mod detail;
mod process;
mod status;

#[cfg(test)]
mod tests;

pub use catalog::{list_catalog, refresh_tracked};
pub use create::{create_repo, list_create_options};
pub use detail::repo_detail;
pub(crate) use process::{run_gh_env, run_gh_json, tool_version};
pub use status::{last_status, remember_status, status};

fn as_u64(value: &Value, key: &str) -> u64 {
    value
        .get(key)
        .and_then(|v| v.as_u64().or_else(|| v.as_i64().map(|n| n.max(0) as u64)))
        .unwrap_or(0)
}

fn as_bool(value: &Value, key: &str) -> bool {
    value.get(key).and_then(|v| v.as_bool()).unwrap_or(false)
}

fn as_string(value: &Value, key: &str) -> Option<String> {
    value
        .get(key)
        .and_then(|v| v.as_str())
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|s| s.to_string())
}

fn owner_login(value: &Value) -> String {
    value
        .get("owner")
        .and_then(|o| o.get("login"))
        .and_then(|v| v.as_str())
        .unwrap_or("")
        .to_string()
}

pub fn host() -> String {
    std::env::var("GH_HOST")
        .ok()
        .filter(|h| !h.is_empty())
        .unwrap_or("github.com".into())
        .to_lowercase()
}
