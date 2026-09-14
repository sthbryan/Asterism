import type {
  Cache,
  CatalogRepo,
  Config,
  CreatedRepo,
  Locale,
  RepoDetail,
  RepoHistory,
  Status,
  ThemePref,
  TrackedRepo,
} from "../../lib/types";

export type StoreState = {
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
  detailError: string | null;
};

export type StoreActions = {
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
