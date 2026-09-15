import type {
  Cache,
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
  PullListResult,
  PullRequestDetail,
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
  getCachedRepoDetail: (fullName: string) => Promise<Saved<RepoDetail> | null>;
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
  listPullRequests: (
    repos: string[],
    limit?: number,
    offline?: boolean,
  ) => Promise<PullListResult>;
  getPullRequest: (
    repo: string,
    number: number,
    offline?: boolean,
  ) => Promise<Saved<PullRequestDetail>>;
  getPullDiff: (
    repo: string,
    number: number,
    offline?: boolean,
  ) => Promise<Saved<string>>;
};
