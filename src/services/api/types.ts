import type {
  Cache,
  CatalogRepo,
  Config,
  CreatedRepo,
  CreateOptions,
  CreateRepoInput,
  Diagnostics,
  LocalCheckout,
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
  listLocalCheckouts: () => Promise<LocalCheckout[]>;
  linkLocalCheckout: (fullName: string, path: string) => Promise<LocalCheckout>;
  cloneLocalRepository: (
    fullName: string,
    parentPath: string,
    directoryName: string,
  ) => Promise<LocalCheckout>;
  unlinkLocalCheckout: (fullName: string, path: string) => Promise<void>;
  openLocalCheckout: (
    fullName: string,
    path: string,
    target: "folder" | "vscode" | "cursor" | "zed",
  ) => Promise<void>;
  chooseLocalFolder: () => Promise<string | null>;
};
