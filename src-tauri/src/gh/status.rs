use std::sync::Mutex;

use super::{as_string, run_gh_json};
use crate::models::Status;

pub fn status() -> Status {
    match run_gh_json(&["api", "user"]) {
        Ok(json) => {
            let login = as_string(&json, "login");
            if login.is_none() {
                Status {
                    ok: false,
                    login: None,
                    error: Some("GitHub CLI did not return an authenticated user.".to_string()),
                    hint: Some("Run gh auth login, then check the connection again.".to_string()),
                }
            } else {
                Status {
                    ok: true,
                    login,
                    error: None,
                    hint: None,
                }
            }
        }
        Err(err) => {
            let missing = err.contains("was not found");
            Status {
                ok: false,
                login: None,
                error: Some(err),
                hint: Some(if missing {
                    "Install GitHub CLI from https://cli.github.com and run gh auth login."
                        .to_string()
                } else {
                    "Sign in with gh auth login, then check the connection again.".to_string()
                }),
            }
        }
    }
}

static STATUS_CACHE: Mutex<Option<(std::time::Instant, Status)>> = Mutex::new(None);

pub fn last_status() -> Option<Status> {
    STATUS_CACHE
        .lock()
        .ok()
        .and_then(|cache| cache.clone())
        .map(|(_, status)| status)
}

pub fn remember_status(status: &Status) {
    if let Ok(mut cache) = STATUS_CACHE.lock() {
        *cache = Some((std::time::Instant::now(), status.clone()));
    }
}

