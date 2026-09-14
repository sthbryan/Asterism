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
export const saveLocale = (
  locale: Parameters<typeof tauriClient.saveLocale>[0],
) => client().saveLocale(locale);
export const getDiagnostics = () => client().getDiagnostics();
