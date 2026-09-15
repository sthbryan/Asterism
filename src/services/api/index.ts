import { mockClient } from "./mock";
import { isMockMode } from "./mode";
import { tauriClient } from "./tauri";

export { isMockMode } from "./mode";

function client() {
  return isMockMode() ? mockClient : tauriClient;
}

export const getLocalState = () => client().getLocalState();
export const useLegacyData = () => client().useLegacyData();
export const importLegacyData = () => client().importLegacyData();
export const clearLocalCache = () => client().clearLocalCache();
export const getStatus = () => client().getStatus();
export const getConfig = () => client().getConfig();
export const saveConfig = (repos: string[]) => client().saveConfig(repos);
export const getCache = () => client().getCache();
export const listCatalog = () => client().listCatalog();
export const listCreateOptions = () => client().listCreateOptions();
export const createRepo = (
  input: Parameters<typeof tauriClient.createRepo>[0],
) => client().createRepo(input);
export const refreshTracked = () => client().refreshTracked();
export const getRepoDetail = (fullName: string, offline = false) =>
  client().getRepoDetail(fullName, offline);
export const getCachedRepoDetail = (fullName: string) =>
  client().getCachedRepoDetail(fullName);
export const saveLocale = (
  locale: Parameters<typeof tauriClient.saveLocale>[0],
) => client().saveLocale(locale);
export const getDiagnostics = () => client().getDiagnostics();
export const listLocalCheckouts = () => client().listLocalCheckouts();
export const linkLocalCheckout = (fullName: string, path: string) =>
  client().linkLocalCheckout(fullName, path);
export const cloneLocalRepository = (
  fullName: string,
  parentPath: string,
  directoryName: string,
) => client().cloneLocalRepository(fullName, parentPath, directoryName);
export const unlinkLocalCheckout = (fullName: string, path: string) =>
  client().unlinkLocalCheckout(fullName, path);
export const openLocalCheckout = (
  fullName: string,
  path: string,
  target: "folder" | "vscode" | "cursor" | "zed",
) => client().openLocalCheckout(fullName, path, target);
export const gitSyncStatus = (fullName: string, path: string) =>
  client().gitSyncStatus(fullName, path);
export const gitFetch = (fullName: string, path: string) =>
  client().gitFetch(fullName, path);
export const gitPull = (fullName: string, path: string) =>
  client().gitPull(fullName, path);
export const gitPush = (fullName: string, path: string, setUpstream: boolean) =>
  client().gitPush(fullName, path, setUpstream);
export const gitSwitchBranch = (
  fullName: string,
  path: string,
  branch: string,
) => client().gitSwitchBranch(fullName, path, branch);
export const gitCreateBranch = (
  fullName: string,
  path: string,
  branch: string,
  switchTo: boolean,
) => client().gitCreateBranch(fullName, path, branch, switchTo);
export const chooseLocalFolder = () => client().chooseLocalFolder();
