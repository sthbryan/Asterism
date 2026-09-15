use super::{
    account_file, legacy_read, Document, LocalState, Preferences, Projects, Storage,
    MAX_HISTORY_REPOS, MAX_POINTS, VERSION,
};
use crate::models::*;
use serde::{de::DeserializeOwned, Serialize};
use std::{collections::BTreeMap, fs};
use tauri::Runtime;
use tauri_plugin_store::StoreBuilder;

impl<R: Runtime> Storage<R> {
    pub(crate) fn read<T: DeserializeOwned>(&self, name: &str) -> Result<Option<T>, String> {
        let path = self.root.join(name);
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
    pub(crate) fn write<T: Serialize>(&self, name: &str, data: &T) -> Result<(), String> {
        let path = self.root.join(name);
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
    pub(crate) fn prefs(&self) -> Result<Preferences, String> {
        Ok(self.read("preferences.json")?.unwrap_or_default())
    }
    pub fn account(&self) -> Result<Option<String>, String> {
        Ok(self.prefs()?.last_account)
    }
    pub(crate) fn account_file(&self, kind: &str) -> Result<String, String> {
        Ok(account_file(
            &self.account()?.ok_or("No saved account is selected.")?,
            kind,
        ))
    }
    pub(crate) fn projects(&self) -> Result<Projects, String> {
        match self.account()? {
            Some(a) => Ok(self
                .read(&account_file(&a, "projects"))?
                .unwrap_or_default()),
            None => Ok(Projects::default()),
        }
    }
    pub fn checkout_folders(&self) -> Result<BTreeMap<String, Vec<String>>, String> {
        Ok(self.projects()?.folders)
    }
    pub fn save_checkout_folders(
        &self,
        folders: BTreeMap<String, Vec<String>>,
    ) -> Result<(), String> {
        let mut p = self.projects()?;
        p.folders = folders;
        self.write(&self.account_file("projects")?, &p)
    }
    pub fn migrate(&self) -> Result<(), String> {
        let mut prefs = self.prefs()?;
        if prefs.migrated {
            return Ok(());
        }
        let cfg: Config =
            legacy_read(&self.home.join(".config/asterism/config.json"))?.unwrap_or_default();
        let hist: HistoryStore =
            legacy_read(&self.home.join(".cache/asterism/history.json"))?.unwrap_or_default();
        if cfg.version > 1 || hist.version > 1 {
            return Err("Unsupported legacy data version. Original files were kept.".into());
        }
        let projects = Projects {
            repos: cfg.repos,
            ..Default::default()
        };
        self.seed(&account_file("legacy", "projects"), &projects)?;
        self.seed(&account_file("legacy", "history"), &hist)?;
        prefs.theme = cfg.theme;
        prefs.transparency = cfg.transparency;
        prefs.locale = cfg.locale;
        prefs.migrated = true;
        self.write("preferences.json", &prefs)
    }
    pub(crate) fn seed<T: Serialize>(&self, name: &str, value: &T) -> Result<(), String> {
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
        let legacy_history: HistoryStore = self
            .read(&account_file("legacy", "history"))?
            .unwrap_or_default();
        Ok(LocalState {
            account: self.account()?,
            config,
            legacy_available: !self.projects()?.legacy_imported
                && (!legacy.repos.is_empty() || !legacy_history.repos.is_empty()),
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
        let mut hist = self.load_history()?;
        let old_hist: HistoryStore = self
            .read(&account_file("legacy", "history"))?
            .unwrap_or_default();
        for (name, series) in old_hist.repos {
            hist.repos.entry(name).or_insert(series);
        }
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
}
