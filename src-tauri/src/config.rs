//! Versioned Plugin Store persistence. Callers serialize compound operations.
use crate::{history, models::*};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use std::{
    collections::BTreeMap,
    fs,
    path::{Path, PathBuf},
    sync::OnceLock,
};
use tauri::{AppHandle, Manager, Runtime};
use tauri_plugin_store::StoreBuilder;

pub fn serialized<T>(f: impl FnOnce() -> T) -> T {
    static LOCK: std::sync::Mutex<()> = std::sync::Mutex::new(());
    let _guard = LOCK.lock().unwrap_or_else(|e| e.into_inner());
    f()
}

static APP: OnceLock<AppHandle> = OnceLock::new();
const VERSION: u32 = 1;
const MAX_CACHE_BYTES: usize = 16 * 1024 * 1024;
const MAX_DETAILS: usize = 100;
const MAX_POINTS: usize = 180;
const MAX_HISTORY_REPOS: usize = 500;

pub fn init(app: AppHandle) {
    let _ = APP.set(app);
}
pub fn storage() -> Result<Storage<tauri::Wry>, String> {
    let app = APP.get().ok_or("Storage is not initialized.")?.clone();
    let root = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let home = std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .map(PathBuf::from)
        .ok_or("Could not resolve the home directory.")?;
    Ok(Storage { app, root, home })
}

#[derive(Serialize, Deserialize)]
struct Document<T> {
    version: u32,
    data: T,
}
#[derive(Default, Serialize, Deserialize)]
#[serde(default, rename_all = "camelCase")]
struct Preferences {
    theme: ThemePref,
    transparency: bool,
    locale: Option<Locale>,
    last_account: Option<String>,
    migrated: bool,
}
#[derive(Default, Serialize, Deserialize)]
#[serde(default)]
struct Projects {
    repos: Vec<String>,
    folders: BTreeMap<String, Vec<String>>,
    legacy_imported: bool,
}
#[derive(Default, Serialize, Deserialize)]
#[serde(default)]
struct AccountCache {
    summary: Option<Cache>,
    catalog: Option<Saved<Vec<CatalogRepo>>>,
    details: BTreeMap<String, Saved<RepoDetail>>,
    pull_requests: BTreeMap<String, serde_json::Value>,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Saved<T> {
    pub fetched_at: u64,
    pub data: T,
    pub warning: Option<String>,
}
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalState {
    pub account: Option<String>,
    pub config: Config,
    pub cache: Option<Cache>,
    pub catalog: Option<Saved<Vec<CatalogRepo>>>,
    pub legacy_available: bool,
    pub data_path: String,
}

pub struct Storage<R: Runtime> {
    app: AppHandle<R>,
    root: PathBuf,
    home: PathBuf,
}
impl<R: Runtime> Storage<R> {
    fn read<T: DeserializeOwned>(&self, name: &str) -> Result<Option<T>, String> {
        let path = self.root.join(name);
        // StoreBuilder ignores load errors; preflight protects corrupt/future data.
        match fs::read(&path) {
            Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Ok(None),
            Err(e) => return Err(format!("Could not read {}: {e}", path.display())),
            Ok(raw) => {
                serde_json::from_slice::<serde_json::Map<String, serde_json::Value>>(&raw)
                    .map_err(|e| format!("Invalid store {}: {e}", path.display()))?;
            }
        }
        let store = StoreBuilder::new(&self.app, &path)
            .disable_auto_save()
            .build()
            .map_err(|e| e.to_string())?;
        let value = store.get("document");
        store.close_resource();
        let doc: Document<T> = serde_json::from_value(value.ok_or("Store document is missing.")?)
            .map_err(|e| format!("Invalid store {}: {e}", path.display()))?;
        if doc.version != VERSION {
            return Err(format!(
                "Unsupported store version {} at {}",
                doc.version,
                path.display()
            ));
        }
        Ok(Some(doc.data))
    }
    fn write<T: Serialize>(&self, name: &str, data: &T) -> Result<(), String> {
        let path = self.root.join(name);
        // Never overwrite data from a newer version or a damaged store.
        self.read::<serde_json::Value>(name)?;
        let value = serde_json::to_value(Document {
            version: VERSION,
            data,
        })
        .map_err(|e| e.to_string())?;
        fs::create_dir_all(path.parent().ok_or("Invalid storage path.")?)
            .map_err(|e| e.to_string())?;
        let pending = path.with_extension("pending");
        let store = StoreBuilder::new(&self.app, &pending)
            .disable_auto_save()
            .create_new()
            .build()
            .map_err(|e| e.to_string())?;
        store.set("document", value);
        let result = store
            .save()
            .map_err(|e| format!("Could not save {}: {e}", path.display()));
        store.close_resource();
        result?;
        fs::File::open(&pending)
            .and_then(|f| f.sync_all())
            .map_err(|e| e.to_string())?;
        fs::rename(&pending, &path).map_err(|e| format!("Could not commit {}: {e}", path.display()))
    }
    fn prefs(&self) -> Result<Preferences, String> {
        Ok(self.read("preferences.json")?.unwrap_or_default())
    }
    pub fn account(&self) -> Result<Option<String>, String> {
        Ok(self.prefs()?.last_account)
    }
    fn account_file(&self, kind: &str) -> Result<String, String> {
        Ok(account_file(
            &self.account()?.ok_or("No saved account is selected.")?,
            kind,
        ))
    }
    fn projects(&self) -> Result<Projects, String> {
        match self.account()? {
            Some(a) => Ok(self
                .read(&account_file(&a, "projects"))?
                .unwrap_or_default()),
            None => Ok(Projects::default()),
        }
    }
    fn cached(&self) -> Result<AccountCache, String> {
        match self.account()? {
            Some(a) => Ok(self.read(&account_file(&a, "cache"))?.unwrap_or_default()),
            None => Ok(AccountCache::default()),
        }
    }
    fn save_cached(&self, mut cache: AccountCache) -> Result<(), String> {
        bound_cache(&mut cache)?;
        self.write(&self.account_file("cache")?, &cache)
    }
    pub fn migrate(&self) -> Result<(), String> {
        let mut prefs = self.prefs()?;
        if prefs.migrated {
            return Ok(());
        }
        // Parse every source before the first write. Originals remain untouched.
        let cfg: Config =
            legacy_read(&self.home.join(".config/asterism/config.json"))?.unwrap_or_default();
        let mut cache: Option<Cache> = legacy_read(&self.home.join(".cache/asterism/cache.json"))?;
        let hist: HistoryStore =
            legacy_read(&self.home.join(".cache/asterism/history.json"))?.unwrap_or_default();
        if cfg.version > 1 || hist.version > 1 {
            return Err("Unsupported legacy data version. Original files were kept.".into());
        }
        if let Some(c) = &mut cache {
            c.history = hist.repos.clone();
            for repo in &mut c.repos {
                repo.fetched_at = Some(c.fetched_at);
            }
        }
        let projects = Projects {
            repos: cfg.repos,
            ..Default::default()
        };
        self.seed(&account_file("legacy", "projects"), &projects)?;
        self.seed(
            &account_file("legacy", "cache"),
            &AccountCache {
                summary: cache,
                ..Default::default()
            },
        )?;
        self.seed(&account_file("legacy", "history"), &hist)?;
        prefs.theme = cfg.theme;
        prefs.transparency = cfg.transparency;
        prefs.locale = cfg.locale;
        prefs.migrated = true;
        self.write("preferences.json", &prefs)
    }
    fn seed<T: Serialize>(&self, name: &str, value: &T) -> Result<(), String> {
        if self.read::<serde_json::Value>(name)?.is_none() {
            self.write(name, value)?;
        }
        Ok(())
    }
    pub fn activate(&self, account: String) -> Result<(), String> {
        self.migrate()?;
        let mut p = self.prefs()?;
        p.last_account = Some(account);
        self.write("preferences.json", &p)
    }
    pub fn load_config(&self) -> Result<Config, String> {
        self.migrate()?;
        let p = self.prefs()?;
        Ok(Config {
            version: VERSION,
            repos: self.projects()?.repos,
            theme: p.theme,
            transparency: p.transparency,
            locale: p.locale,
        })
    }
    pub fn save_repos(&self, mut repos: Vec<String>) -> Result<Config, String> {
        repos.retain(|r| !r.trim().is_empty());
        repos.sort();
        repos.dedup();
        let mut projects = self.projects()?;
        projects.repos = repos;
        self.write(&self.account_file("projects")?, &projects)?;
        self.load_config()
    }
    pub fn save_appearance(&self, theme: ThemePref, transparency: bool) -> Result<Config, String> {
        self.migrate()?;
        let mut p = self.prefs()?;
        p.theme = theme;
        p.transparency = transparency;
        self.write("preferences.json", &p)?;
        self.load_config()
    }
    pub fn save_locale(&self, locale: Locale) -> Result<Config, String> {
        self.migrate()?;
        let mut p = self.prefs()?;
        p.locale = Some(locale);
        self.write("preferences.json", &p)?;
        self.load_config()
    }
    pub fn local_state(&self) -> Result<LocalState, String> {
        let config = self.load_config()?;
        let legacy: Projects = self
            .read(&account_file("legacy", "projects"))?
            .unwrap_or_default();
        let legacy_cache: AccountCache = self
            .read(&account_file("legacy", "cache"))?
            .unwrap_or_default();
        let legacy_history: HistoryStore = self
            .read(&account_file("legacy", "history"))?
            .unwrap_or_default();
        Ok(LocalState {
            account: self.account()?,
            config,
            cache: self.load_cache()?,
            catalog: self.cached()?.catalog,
            legacy_available: !self.projects()?.legacy_imported
                && (!legacy.repos.is_empty()
                    || legacy_cache.summary.is_some()
                    || !legacy_history.repos.is_empty()),
            data_path: self.root.display().to_string(),
        })
    }
    pub fn import_legacy(&self) -> Result<LocalState, String> {
        if self.account()?.as_deref() == Some("legacy") {
            return Err("Connect to an account before importing.".into());
        }
        let mut projects = self.projects()?;
        if projects.legacy_imported {
            return self.local_state();
        }
        let old: Projects = self
            .read(&account_file("legacy", "projects"))?
            .unwrap_or_default();
        let mut cache = self.cached()?;
        let old_cache: AccountCache = self
            .read(&account_file("legacy", "cache"))?
            .unwrap_or_default();
        // Existing account observations always win. Import only missing repositories.
        if let Some(mut previous) = old_cache.summary {
            if let Some(current) = &mut cache.summary {
                previous
                    .repos
                    .retain(|r| !current.repos.iter().any(|c| c.full_name == r.full_name));
                current.repos.extend(previous.repos);
                current.fetched_at = current.fetched_at.min(previous.fetched_at);
            } else {
                cache.summary = Some(previous);
            }
        }
        let mut hist = self.load_history()?;
        let old_hist: HistoryStore = self
            .read(&account_file("legacy", "history"))?
            .unwrap_or_default();
        for (name, series) in old_hist.repos {
            hist.repos.entry(name).or_insert(series);
        }
        // Marker is written last, making interrupted imports repeatable.
        self.save_cached(cache)?;
        self.save_history(&hist)?;
        projects.repos.extend(old.repos);
        projects.repos.sort();
        projects.repos.dedup();
        projects.legacy_imported = true;
        self.write(&self.account_file("projects")?, &projects)?;
        self.local_state()
    }
    pub fn load_history(&self) -> Result<HistoryStore, String> {
        if self.account()?.is_none() {
            return Ok(HistoryStore::default());
        }
        Ok(self
            .read(&self.account_file("history")?)?
            .unwrap_or_default())
    }
    pub fn save_history(&self, history: &HistoryStore) -> Result<(), String> {
        let mut bounded = history.clone();
        for series in bounded.repos.values_mut() {
            for points in [&mut series.stars, &mut series.downloads, &mut series.forks] {
                if points.len() > MAX_POINTS {
                    points.drain(..points.len() - MAX_POINTS);
                }
            }
        }
        while bounded.repos.len() > MAX_HISTORY_REPOS {
            let oldest = bounded
                .repos
                .iter()
                .min_by_key(|(_, h)| h.downloads.last().map(|p| p.ts).unwrap_or(0))
                .map(|(k, _)| k.clone())
                .unwrap();
            bounded.repos.remove(&oldest);
        }
        self.write(&self.account_file("history")?, &bounded)
    }
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
        Ok(self.cached()?.details.remove(name))
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
    pub fn clear_cache(&self) -> Result<LocalState, String> {
        self.write(&self.account_file("cache")?, &AccountCache::default())?;
        self.local_state()
    }
    pub fn config_path(&self) -> PathBuf {
        self.root.join("preferences.json")
    }
    pub fn cache_path(&self) -> Result<PathBuf, String> {
        Ok(self.root.join(self.account_file("cache")?))
    }
    pub fn history_path(&self) -> Result<PathBuf, String> {
        Ok(self.root.join(self.account_file("history")?))
    }
}
fn account_file(account: &str, kind: &str) -> String {
    let encoded: String = account.bytes().map(|b| format!("{b:02x}")).collect();
    format!("accounts/{encoded}/{kind}.json")
}
fn legacy_read<T: DeserializeOwned>(path: &Path) -> Result<Option<T>, String> {
    match fs::read(path) {
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(e) => Err(format!("Could not read {}: {e}", path.display())),
        Ok(raw) => serde_json::from_slice(&raw)
            .map(Some)
            .map_err(|e| format!("Invalid legacy data {}: {e}", path.display())),
    }
}
fn bound_cache(cache: &mut AccountCache) -> Result<(), String> {
    while cache.details.len() > MAX_DETAILS
        || serde_json::to_vec(cache).map_err(|e| e.to_string())?.len() > MAX_CACHE_BYTES
    {
        if let Some(key) = cache
            .details
            .iter()
            .min_by_key(|(_, v)| v.fetched_at)
            .map(|(k, _)| k.clone())
        {
            cache.details.remove(&key);
        } else {
            return Err("Cache exceeds 16 MiB. Previous saved data was kept.".into());
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests;
