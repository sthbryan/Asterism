import type {
  Cache,
  CacheInfo,
  CatalogRepo,
  Config,
  CreatedRepo,
  CreateOptions,
  CreateRepoInput,
  Diagnostics,
  GitSyncStatus,
  LocalCheckout,
  Locale,
  LocalState,
  PersistentCache,
  PullListResult,
  PullRequestDetail,
  PullRequestFilters,
  RepoDetail,
  Saved,
  Status,
} from "@/lib/types";

export type ApiClient = {
  getCacheInfo: () => Promise<CacheInfo>;
  clearCache: () => Promise<number>;
  readCache: <T>(
    namespace: string,
    key: string,
  ) => Promise<PersistentCache<T> | null>;
  writeCache: <T>(
    namespace: string,
    key: string,
    entry: PersistentCache<T>,
  ) => Promise<void>;
  getLocalState: () => Promise<LocalState>;
  useLegacyData: () => Promise<LocalState>;
  importLegacyData: () => Promise<LocalState>;
  getStatus: () => Promise<Status>;
  getConfig: () => Promise<Config>;
  saveConfig: (repos: string[]) => Promise<Config>;
  listCatalog: () => Promise<CatalogRepo[]>;
  listCreateOptions: () => Promise<CreateOptions>;
  createRepo: (input: CreateRepoInput) => Promise<CreatedRepo>;
  refreshTracked: () => Promise<Cache>;
  getRepoDetail: (fullName: string) => Promise<Saved<RepoDetail>>;
  refreshPullRequests: (
    filters?: PullRequestFilters,
  ) => Promise<Saved<PullListResult>>;
  saveLocale: (locale: Locale) => Promise<Config>;
  getDiagnostics: () => Promise<Diagnostics>;
  listLocalCheckouts: () => Promise<LocalCheckout[]>;
  linkLocalCheckout: (fullName: string, path: string) => Promise<LocalCheckout>;
  cloneLocalRepository: (
    fullName: string,
    parentPath: string,
    directoryName: string,
  ) => Promise<LocalCheckout>;
  unlinkLocalCheckout: (fullName: string, path: string) => Promise<void>;
  gitSyncStatus: (fullName: string, path: string) => Promise<GitSyncStatus>;
  gitFetch: (fullName: string, path: string) => Promise<GitSyncStatus>;
  gitPull: (fullName: string, path: string) => Promise<GitSyncStatus>;
  gitPush: (
    fullName: string,
    path: string,
    setUpstream: boolean,
  ) => Promise<GitSyncStatus>;
  gitSwitchBranch: (
    fullName: string,
    path: string,
    branch: string,
  ) => Promise<GitSyncStatus>;
  gitCreateBranch: (
    fullName: string,
    path: string,
    branch: string,
    switchTo: boolean,
  ) => Promise<GitSyncStatus>;
  openLocalCheckout: (
    fullName: string,
    path: string,
    target: "folder" | "vscode" | "cursor" | "zed",
  ) => Promise<void>;
  chooseLocalFolder: () => Promise<string | null>;
  getPullRequest: (
    repo: string,
    number: number,
  ) => Promise<Saved<PullRequestDetail>>;
  getPullDiff: (repo: string, number: number) => Promise<Saved<string>>;
};
