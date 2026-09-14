import { invoke } from "@tauri-apps/api/core";
import { persistLocale } from "@/lib/i18n/locale";
import { enqueuePreference } from "@/lib/preferences";
import type { LocalState } from "@/lib/types";
import type { ApiClient } from "./types";

let account: string | null = null;
async function local(command: string) {
  const state = await invoke<LocalState>(command, { expectedAccount: account });
  account = state.account;
  return state;
}
export const tauriClient: ApiClient = {
  getLocalState: () => local("get_local_state"),
  useLegacyData: () => local("use_legacy_data"),
  importLegacyData: () => local("import_legacy_data"),
  clearLocalCache: () => local("clear_local_cache"),
  getStatus: () => invoke("get_status"),
  getConfig: () => invoke("get_config"),
  saveConfig: (repos) =>
    invoke("save_config", { repos, expectedAccount: account }),
  getCache: () => invoke("get_cache"),
  listCatalog: () => invoke("list_catalog", { expectedAccount: account }),
  listCreateOptions: () =>
    invoke("list_create_options", { expectedAccount: account }),
  createRepo: (input) =>
    invoke("create_repo", { input, expectedAccount: account }),
  refreshTracked: () => invoke("refresh_tracked", { expectedAccount: account }),
  getRepoDetail: (fullName, offline) =>
    invoke("get_repo_detail", { fullName, offline, expectedAccount: account }),
  saveLocale: (locale) => {
    persistLocale(locale);
    return enqueuePreference(() => invoke("save_locale", { locale }));
  },
  getDiagnostics: () => invoke("get_diagnostics"),
};
