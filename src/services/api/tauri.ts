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
  getCachedRepoDetail: (fullName) =>
    invoke("get_cached_detail", {
      fullName,
      expectedAccount: account,
    }),
  saveLocale: (locale) => {
    persistLocale(locale);
    return enqueuePreference(() => invoke("save_locale", { locale }));
  },
  getDiagnostics: () => invoke("get_diagnostics"),
  listLocalCheckouts: () =>
    invoke("list_local_checkouts", { expectedAccount: account }),
  linkLocalCheckout: (fullName, path) =>
    invoke("link_local_checkout", { fullName, path, expectedAccount: account }),
  cloneLocalRepository: (fullName, parentPath, directoryName) =>
    invoke("clone_local_repository", {
      fullName,
      parentPath,
      directoryName,
      expectedAccount: account,
    }),
  unlinkLocalCheckout: (fullName, path) =>
    invoke("unlink_local_checkout", {
      fullName,
      path,
      expectedAccount: account,
    }),
  openLocalCheckout: (fullName, path, target) =>
    invoke("open_local_checkout", {
      fullName,
      path,
      target,
      expectedAccount: account,
    }),
  gitSyncStatus: (fullName, path) =>
    invoke("git_sync_status", { fullName, path, expectedAccount: account }),
  gitFetch: (fullName, path) =>
    invoke("git_fetch", { fullName, path, expectedAccount: account }),
  gitPull: (fullName, path) =>
    invoke("git_pull", { fullName, path, expectedAccount: account }),
  gitPush: (fullName, path, setUpstream) =>
    invoke("git_push", {
      fullName,
      path,
      setUpstream,
      expectedAccount: account,
    }),
  gitSwitchBranch: (fullName, path, branch) =>
    invoke("git_switch_branch", {
      fullName,
      path,
      branch,
      expectedAccount: account,
    }),
  gitCreateBranch: (fullName, path, branch, switchTo) =>
    invoke("git_create_branch", {
      fullName,
      path,
      branch,
      switch: switchTo,
      expectedAccount: account,
    }),
  chooseLocalFolder: async () => {
    const { open } = await import("@tauri-apps/plugin-dialog");
    const selected = await open({ directory: true, multiple: false });
    return typeof selected === "string" ? selected : null;
  },
  listPullRequests: (repos, limit = 100, offline = false) =>
    invoke("list_pull_requests", {
      repos,
      limit,
      offline,
      expectedAccount: account,
    }),
  getPullRequest: (repo, number, offline = false) =>
    invoke("get_pull_request", {
      repo,
      number,
      offline,
      expectedAccount: account,
    }),
  getPullDiff: (repo, number, offline = false) =>
    invoke("get_pull_diff", {
      repo,
      number,
      offline,
      expectedAccount: account,
    }),
};
