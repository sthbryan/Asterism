import type {
  Cache,
  CatalogRepo,
  Config,
  CreatedRepo,
  CreateOptions,
  CreateRepoInput,
  Diagnostics,
  Locale,
  LocalState,
  RepoDetail,
  Saved,
  Status,
} from "@/lib/types";

export type ApiClient = {
  getLocalState: () => Promise<LocalState>;
  useLegacyData: () => Promise<LocalState>;
  importLegacyData: () => Promise<LocalState>;
  clearLocalCache: () => Promise<LocalState>;
  getStatus: () => Promise<Status>;
  getConfig: () => Promise<Config>;
  saveConfig: (repos: string[]) => Promise<Config>;
  getCache: () => Promise<Cache | null>;
  listCatalog: () => Promise<CatalogRepo[]>;
  listCreateOptions: () => Promise<CreateOptions>;
  createRepo: (input: CreateRepoInput) => Promise<CreatedRepo>;
  refreshTracked: () => Promise<Cache>;
  getRepoDetail: (
    fullName: string,
    offline: boolean,
  ) => Promise<Saved<RepoDetail>>;
  saveLocale: (locale: Locale) => Promise<Config>;
  getDiagnostics: () => Promise<Diagnostics>;
};
