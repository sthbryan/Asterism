use super::{AccountCache, LocalState, Saved, Storage, pull_detail_key};
use crate::{history, models::*};
use std::collections::BTreeMap;
use tauri::Runtime;

impl<R: Runtime> Storage<R> {
    pub fn load_cache(&self) -> Result<Option<Cache>, String> {
        let mut cache = self.cached()?.summary;
        if let Some(c) = &mut cache {
            let names = self.projects()?.repos;
            c.repos.retain(|r| names.contains(&r.full_name));
            c.history = self.load_history()?.repos;
        }
        Ok(cache)
    }
    pub fn save_cache(
        &self,
        repos: Vec<TrackedRepo>,
        history: BTreeMap<String, RepoHistory>,
    ) -> Result<Cache, String> {
        let result = Cache {
            fetched_at: history::now_secs(),
            repos,
            history,
        };
        let mut cache = self.cached()?;
        cache.summary = Some(Cache {
            history: BTreeMap::new(),
            ..result.clone()
        });
        self.save_cached(cache)?;
        Ok(result)
    }
    pub fn save_catalog(&self, rows: Vec<CatalogRepo>) -> Result<Vec<CatalogRepo>, String> {
        let mut cache = self.cached()?;
        cache.catalog = Some(Saved {
            fetched_at: history::now_secs(),
            data: rows.clone(),
            warning: None,
        });
        self.save_cached(cache)?;
        Ok(rows)
    }
    pub fn load_detail(&self, name: &str) -> Result<Option<Saved<RepoDetail>>, String> {
        Ok(self.cached()?.details.get(name).cloned())
    }
    pub fn save_detail(&self, detail: RepoDetail) -> Result<Saved<RepoDetail>, String> {
        let mut cache = self.cached()?;
        let saved = Saved {
            fetched_at: history::now_secs(),
            data: detail,
            warning: None,
        };
        cache
            .details
            .insert(saved.data.full_name.clone(), saved.clone());
        self.save_cached(cache)?;
        Ok(saved)
    }
    pub fn load_pull_list(&self) -> Result<Option<Saved<PullListResult>>, String> {
        let cache = self.cached()?;
        if let Some(result) = cache.pull_result {
            return Ok(Some(result));
        }
        Ok(cache.pull_list.map(|legacy| Saved {
            fetched_at: legacy.fetched_at,
            data: PullListResult {
                pulls: legacy.data,
                errors: BTreeMap::new(),
                fetched_at: legacy.fetched_at,
                page: 1,
                per_page: 30,
                total: 0,
                has_next_page: false,
            },
            warning: legacy.warning,
        }))
    }
    pub fn save_pull_list(&self, result: PullListResult) -> Result<Saved<PullListResult>, String> {
        let mut cache = self.cached()?;
        let saved = Saved {
            fetched_at: result.fetched_at,
            data: result,
            warning: None,
        };
        cache.pull_result = Some(saved.clone());
        self.save_cached(cache)?;
        Ok(saved)
    }
    pub fn load_pull_detail(
        &self,
        repo: &str,
        number: u64,
    ) -> Result<Option<Saved<PullRequestDetail>>, String> {
        Ok(self
            .cached()?
            .pull_details
            .get(&pull_detail_key(repo, number))
            .cloned())
    }
    pub fn save_pull_detail(
        &self,
        detail: PullRequestDetail,
    ) -> Result<Saved<PullRequestDetail>, String> {
        let mut cache = self.cached()?;
        let saved = Saved {
            fetched_at: history::now_secs(),
            data: detail,
            warning: None,
        };
        cache.pull_details.insert(
            pull_detail_key(&saved.data.summary.repo, saved.data.summary.number),
            saved.clone(),
        );
        self.save_cached(cache)?;
        Ok(saved)
    }
    pub fn load_pull_diff(&self, repo: &str, number: u64) -> Result<Option<Saved<String>>, String> {
        Ok(self
            .cached()?
            .pull_diffs
            .get(&pull_detail_key(repo, number))
            .cloned())
    }
    pub fn save_pull_diff(
        &self,
        repo: &str,
        number: u64,
        diff: String,
    ) -> Result<Saved<String>, String> {
        let mut cache = self.cached()?;
        let saved = Saved {
            fetched_at: history::now_secs(),
            data: diff,
            warning: None,
        };
        cache
            .pull_diffs
            .insert(pull_detail_key(repo, number), saved.clone());
        self.save_cached(cache)?;
        Ok(saved)
    }
    pub fn clear_cache(&self) -> Result<LocalState, String> {
        self.write(&self.account_file("cache")?, &AccountCache::default())?;
        self.local_state()
    }
}
