import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
  type MutableRefObject,
  type ReactNode,
} from "react";
import { useLocation } from "wouter";
import {
  getRepoDetail,
  listCatalog,
  refreshTracked,
  saveConfig,
} from "../lib/api";
import type {
  Cache,
  CatalogRepo,
  Config,
  CreatedRepo,
  RepoDetail,
  RepoHistory,
  Status,
  ThemePref,
  TrackedRepo,
} from "../lib/types";

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
  catalog: CatalogRepo[];
  catalogLoading: boolean;
  catalogError: string | null;
  detail: RepoDetail | null;
  detailLoading: boolean;
  detailError: string | null;
};

export type StoreAction =
  | { type: "bootStart" }
  | { type: "bootOk"; status: Status; config: Config; cache: Cache | null }
  | { type: "bootFail"; status: Status }
  | { type: "refreshStart" }
  | { type: "refreshed"; cache: Cache }
  | { type: "refreshFail"; banner: string }
  | { type: "catalogStart" }
  | { type: "catalogOk"; rows: CatalogRepo[] }
  | { type: "catalogFail"; error: string }
  | { type: "detailStart" }
  | { type: "detailOk"; detail: RepoDetail }
  | { type: "detailFail"; error: string }
  | { type: "detailClear" }
  | { type: "select"; repos: string[] }
  | { type: "trackedClear" }
  | { type: "mergeHistory"; fullName: string; detail: RepoDetail }
  | { type: "banner"; message: string | null };

const initialState: StoreState = {
  bootAttempt: 0,
  booted: false,
  status: null,
  tracked: [],
  history: {},
  selectedNames: [],
  fetchedAt: null,
  refreshing: false,
  banner: null,
  theme: "dark",
  transparency: false,
  catalog: [],
  catalogLoading: false,
  catalogError: null,
  detail: null,
  detailLoading: false,
  detailError: null,
};

function reducer(state: StoreState, action: StoreAction): StoreState {
  switch (action.type) {
    case "bootStart":
      return { ...state, bootAttempt: state.bootAttempt + 1, booted: false };
    case "bootOk":
      return {
        ...state,
        booted: true,
        status: action.status,
        selectedNames: action.config.repos,
        theme: action.config.theme ?? state.theme,
        transparency: Boolean(action.config.transparency),
        tracked: action.cache?.repos ?? [],
        fetchedAt: action.cache?.fetchedAt ?? null,
        history: action.cache?.history ?? {},
      };
    case "bootFail":
      return { ...state, booted: false, status: action.status };
    case "refreshStart":
      return { ...state, refreshing: true, banner: null };
    case "refreshed":
      return {
        ...state,
        refreshing: false,
        tracked: action.cache.repos,
        fetchedAt: action.cache.fetchedAt,
        history: action.cache.history ?? {},
      };
    case "refreshFail":
      return { ...state, refreshing: false, banner: action.banner };
    case "catalogStart":
      return { ...state, catalogLoading: true, catalogError: null };
    case "catalogOk":
      return { ...state, catalogLoading: false, catalog: action.rows };
    case "catalogFail":
      return { ...state, catalogLoading: false, catalogError: action.error };
    case "detailStart":
      return { ...state, detail: null, detailError: null, detailLoading: true };
    case "detailOk":
      return { ...state, detail: action.detail, detailLoading: false };
    case "detailFail":
      return { ...state, detailError: action.error, detailLoading: false };
    case "detailClear":
      return { ...state, detail: null, detailError: null, detailLoading: false };
    case "select":
      return { ...state, selectedNames: action.repos };
    case "trackedClear":
      return { ...state, tracked: [], fetchedAt: null, history: {} };
    case "mergeHistory":
      return {
        ...state,
        history: {
          ...state.history,
          [action.fullName]: {
            stars: action.detail.starHistory ?? [],
            downloads: action.detail.downloadHistory ?? [],
            forks: state.history[action.fullName]?.forks ?? [],
          },
        },
      };
    case "banner":
      return { ...state, banner: action.message };
    default:
      return state;
  }
}

export type StoreValue = {
  state: StoreState;
  dispatch: Dispatch<StoreAction>;
  runRefresh: () => Promise<void>;
  loadCatalog: () => Promise<void>;
  fetchDetail: (fullName: string) => Promise<void>;
  persistSelection: (repos: string[]) => void;
  handleCreated: (repo: CreatedRepo, track: boolean) => Promise<void>;
  retryBoot: () => void;
  pickerDirty: boolean;
  setPickerDirty: (dirty: boolean) => void;
  pickerSave: MutableRefObject<() => void>;
};

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [, navigate] = useLocation();
  const [pickerDirty, setPickerDirty] = useState(false);
  const pickerSave = useRef<() => void>(() => undefined);
  const catalogRequest = useRef<Promise<void> | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const runRefresh = useCallback(async () => {
    dispatch({ type: "refreshStart" });
    try {
      const cache = await refreshTracked();
      dispatch({ type: "refreshed", cache });
    } catch (err) {
      dispatch({ type: "refreshFail", banner: String(err) });
    }
  }, []);

  const loadCatalog = useCallback(() => {
    if (catalogRequest.current) return catalogRequest.current;
    dispatch({ type: "catalogStart" });
    const request = (async () => {
      try {
        const rows = await listCatalog();
        dispatch({ type: "catalogOk", rows });
      } catch (err) {
        dispatch({ type: "catalogFail", error: String(err) });
      } finally {
        catalogRequest.current = null;
      }
    })();
    catalogRequest.current = request;
    return request;
  }, []);

  const fetchDetail = useCallback(async (fullName: string) => {
    dispatch({ type: "detailStart" });
    try {
      const next = await getRepoDetail(fullName);
      dispatch({ type: "detailOk", detail: next });
      dispatch({ type: "mergeHistory", fullName, detail: next });
    } catch (err) {
      dispatch({ type: "detailFail", error: String(err) });
    }
  }, []);

  const persistSelection = useCallback(
    (repos: string[]) => {
      const previous = stateRef.current.selectedNames;
      dispatch({ type: "select", repos });
      dispatch({ type: "detailClear" });
      navigate("/");
      void (async () => {
        try {
          const cfg = await saveConfig(repos);
          dispatch({ type: "select", repos: cfg.repos });
          if (cfg.repos.length === 0) {
            dispatch({ type: "trackedClear" });
            return;
          }
          await runRefresh();
        } catch (err) {
          dispatch({ type: "select", repos: previous });
          dispatch({ type: "banner", message: String(err) });
        }
      })();
    },
    [navigate, runRefresh],
  );

  const handleCreated = useCallback(
    async (repo: CreatedRepo, track: boolean) => {
      void loadCatalog();
      if (track) {
        const cfg = await saveConfig([
          ...new Set([...stateRef.current.selectedNames, repo.fullName]),
        ]);
        dispatch({ type: "select", repos: cfg.repos });
        await runRefresh();
      }
    },
    [loadCatalog, runRefresh],
  );

  const retryBoot = useCallback(() => {
    navigate("/boot");
    dispatch({ type: "bootStart" });
  }, [navigate]);

  const value = useMemo<StoreValue>(
    () => ({
      state,
      dispatch,
      runRefresh,
      loadCatalog,
      fetchDetail,
      persistSelection,
      handleCreated,
      retryBoot,
      pickerDirty,
      setPickerDirty,
      pickerSave,
    }),
    [
      state,
      runRefresh,
      loadCatalog,
      fetchDetail,
      persistSelection,
      handleCreated,
      retryBoot,
      pickerDirty,
    ],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error("useStore must be used inside <StoreProvider>");
  return value;
}
