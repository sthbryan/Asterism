import type {
  Cache,
  CatalogRepo,
  Config,
  CreatedRepo,
  CreateOptions,
  CreateRepoInput,
  Diagnostics,
  Locale,
  RepoDetail,
  Status,
} from "../../lib/types";

export type ApiClient = {
  getStatus: () => Promise<Status>;
  getConfig: () => Promise<Config>;
  saveConfig: (repos: string[]) => Promise<Config>;
  getCache: () => Promise<Cache | null>;
  listCatalog: () => Promise<CatalogRepo[]>;
  listCreateOptions: () => Promise<CreateOptions>;
  createRepo: (input: CreateRepoInput) => Promise<CreatedRepo>;
  refreshTracked: () => Promise<Cache>;
  getRepoDetail: (fullName: string) => Promise<RepoDetail>;
  saveLocale: (locale: Locale) => Promise<Config>;
  getDiagnostics: () => Promise<Diagnostics>;
};
