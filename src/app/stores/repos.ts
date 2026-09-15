import type { StateCreator } from "zustand";
import { CACHE_TTL_MS, cacheKey, isCacheFresh } from "@/lib/cache";
import type { Cache, PersistentCache } from "@/lib/types";
import {
  getLocalState,
  getStatus,
  readCache,
  refreshTracked,
  saveConfig,
  writeCache,
} from "@/services/api";
import type { AppStore } from "./types";

let selectionRequest = 0;
let overviewCacheKey: string | null = null;
let overviewCacheInFlight: Promise<PersistentCache<Cache> | null> | null = null;
const OVERVIEW_CACHE_NAMESPACE = "overview";
const OVERVIEW_CACHE_VERSION = 1;

function cacheForSelection(cache: Cache, selectedNames: string[]): Cache {
  const selected = new Set(selectedNames);
  const repos = cache.repos.filter((repo) => selected.has(repo.fullName));
  const history = Object.fromEntries(
    Object.entries(cache.history ?? {}).filter(([name]) => selected.has(name)),
  );
  return { fetchedAt: cache.fetchedAt, repos, history };
}

async function readOverviewCache(
  account: string,
): Promise<PersistentCache<Cache> | null> {
  if (overviewCacheKey !== account) {
    overviewCacheKey = account;
    overviewCacheInFlight = null;
  }
  if (!overviewCacheInFlight) {
    overviewCacheInFlight = readCache<Cache>(
      OVERVIEW_CACHE_NAMESPACE,
      cacheKey(OVERVIEW_CACHE_NAMESPACE, account),
    );
  }
  try {
    return await overviewCacheInFlight;
  } finally {
    overviewCacheInFlight = null;
  }
}

export type ReposSlice = Pick<
  AppStore,
  | "tracked"
  | "history"
  | "selectedNames"
  | "fetchedAt"
  | "refreshing"
  | "banner"
  | "runRefresh"
  | "persistSelection"
  | "handleCreated"
  | "setBanner"
>;

export const createReposSlice: StateCreator<AppStore, [], [], ReposSlice> = (
  set,
  get,
) => ({
  tracked: [],
  history: {},
  selectedNames: [],
  fetchedAt: null,
  refreshing: false,
  banner: null,

  runRefresh: async (force = false) => {
    if (!get().status?.ok || get().connecting || get().refreshing) return;
    const revision = get().dataRevision;
    set({ refreshing: true, banner: null });
    try {
      const account = get().account;
      if (!account) {
        set({ refreshing: false });
        return;
      }

      const persisted = await readOverviewCache(account).catch(() => null);
      if (revision !== get().dataRevision) return;
      const selectedNames = get().selectedNames;
      if (persisted?.version === 1) {
        const cached = cacheForSelection(persisted.data, selectedNames);
        const hasCachedData =
          cached.repos.length > 0 || selectedNames.length === 0;
        const coversSelection = cached.repos.length === selectedNames.length;
        if (hasCachedData && (get().tracked.length === 0 || force === false)) {
          set({
            tracked: cached.repos,
            fetchedAt: cached.fetchedAt,
            history: cached.history,
          });
        }
        if (
          !force &&
          coversSelection &&
          isCacheFresh(persisted.fetchedAt, CACHE_TTL_MS.overview)
        ) {
          set({ refreshing: false });
          return;
        }
      }

      const cache = await refreshTracked();
      if (revision !== get().dataRevision) return;
      set({
        refreshing: false,
        tracked: cache.repos,
        fetchedAt: cache.fetchedAt,
        history: cache.history ?? {},
      });
      void writeCache(
        OVERVIEW_CACHE_NAMESPACE,
        cacheKey(OVERVIEW_CACHE_NAMESPACE, account),
        {
          version: OVERVIEW_CACHE_VERSION,
          fetchedAt: cache.fetchedAt,
          data: cache,
          warning: null,
        },
      ).catch(() => undefined);
    } catch (err) {
      if (revision !== get().dataRevision) return;
      set({ refreshing: false, banner: String(err) });
      try {
        const status = await getStatus();
        if (revision !== get().dataRevision) return;
        if (!status.ok) get().bootFail(status);
        else {
          const local = await getLocalState();
          if (revision !== get().dataRevision) return;
          if (local.account !== get().account) {
            get().hydrateLocal(local);
            get().bootFail(status);
          }
        }
      } catch {
        /* The original error and saved data remain visible. */
      }
    }
  },

  persistSelection: async (repos) => {
    const request = ++selectionRequest;
    const account = get().account;
    const previous = get().selectedNames;
    set({ selectedNames: repos, detail: null });
    try {
      const cfg = await saveConfig(repos);

      if (request !== selectionRequest || account !== get().account) return;
      set({
        selectedNames: cfg.repos,
        tracked: get().tracked.filter((r) => cfg.repos.includes(r.fullName)),
      });
      if (cfg.repos.length === 0) {
        set({ tracked: [], fetchedAt: null, history: {} });
        return;
      }
      await get().runRefresh();
    } catch (err) {
      if (request === selectionRequest && account === get().account)
        set({ selectedNames: previous, banner: String(err) });
      throw err;
    }
  },

  handleCreated: async (repo, track) => {
    void get().loadCatalog();
    if (track) {
      const current = get().selectedNames;
      const cfg = await saveConfig(
        Array.from(new Set([...current, repo.fullName])),
      );
      set({ selectedNames: cfg.repos });
      await get().runRefresh();
    }
  },

  setBanner: (message) => {
    set({ banner: message });
  },
});
