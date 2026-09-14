import { invoke } from "@tauri-apps/api/core";
import { persistLocale } from "@/lib/i18n/locale";
import { enqueuePreference } from "@/lib/preferences";
import type { ApiClient } from "./types";

export const tauriClient: ApiClient = {
  getStatus: () => invoke("get_status"),
  getConfig: () => invoke("get_config"),
  saveConfig: (repos) => invoke("save_config", { repos }),
  getCache: () => invoke("get_cache"),
  listCatalog: () => invoke("list_catalog"),
  listCreateOptions: () => invoke("list_create_options"),
  createRepo: (input) => invoke("create_repo", { input }),
  refreshTracked: () => invoke("refresh_tracked"),
  getRepoDetail: (fullName) => invoke("get_repo_detail", { fullName }),
  saveLocale: (locale) => {
    persistLocale(locale);
    return enqueuePreference(() => invoke("save_locale", { locale }));
  },
  getDiagnostics: () => invoke("get_diagnostics"),
};
