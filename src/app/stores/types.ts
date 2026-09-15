import type {
  Cache,
  CatalogRepo,
  Config,
  CreatedRepo,
  Locale,
  LocalState,
  RepoDetail,
  RepoHistory,
  Saved,
  Status,
  ThemePref,
  TrackedRepo,
} from "@/lib/types";

export type StoreState = {
  account: string | null;
  dataPath: string;
  legacyAvailable: boolean;
  connecting: boolean;
  dataRevision: number;
  catalogFetchedAt: number | null;
  detailFetchedAt: number | null;
  detailWarning: string | null;
  bootAttempt: number;
  booted: boolean;
  status: Status | null;
  tracked: TrackedRepo[];
  history: Record<string, RepoHistory>;
  selectedNames: string[];
  fetchedAt: number | null;
  refreshing: boolean;
  banner: string | null;
  theme: ThemePref;
  transparency: boolean;
  locale: Locale;
  preferenceError: string | null;
  catalog: CatalogRepo[];
  catalogLoading: boolean;
  catalogError: string | null;
  detail: RepoDetail | null;
  detailLoading: boolean;
  detailRefreshing: boolean;
  detailError: string | null;
  detailCache: Record<string, Saved<RepoDetail>>;
};

export type StoreActions = {
  hydrateLocal: (local: LocalState) => void;
  setConnecting: (value: boolean) => void;
  setPreferences: (config: Config) => void;
  setPreferenceError: (error: string | null) => void;
  bootStart: () => void;
  bootOk: (status: Status, config: Config, cache: Cache | null) => void;
  bootFail: (status: Status) => void;
  retryBoot: () => void;
  runRefresh: () => Promise<void>;
  loadCatalog: () => Promise<void>;
  fetchDetail: (fullName: string) => Promise<void>;
  clearDetail: () => void;
  persistSelection: (repos: string[]) => Promise<void>;
  handleCreated: (repo: CreatedRepo, track: boolean) => Promise<void>;
  setLocale: (locale: Locale) => Promise<void>;
  setBanner: (message: string | null) => void;
};

export type AppStore = StoreState & StoreActions;
