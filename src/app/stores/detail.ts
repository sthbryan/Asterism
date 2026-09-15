import type { StateCreator } from "zustand";
import { CACHE_TTL_MS, cacheKey, isCacheFresh } from "@/lib/cache";
import type { RepoDetail, Saved } from "@/lib/types";
import { getRepoDetail, readCache, writeCache } from "@/services/api";
import type { AppStore } from "./types";

export type DetailSlice = Pick<
  AppStore,
  | "detailFetchedAt"
  | "detailWarning"
  | "detail"
  | "detailLoading"
  | "detailRefreshing"
  | "detailError"
  | "detailCache"
  | "fetchDetail"
  | "clearDetail"
>;

let detailRequest = 0;
const detailInFlight = new Map<string, Promise<void>>();
const DETAIL_CACHE_NAMESPACE = "detail";
const DETAIL_CACHE_VERSION = 1;

function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms / 1000}s`)),
      ms,
    );
  });
  return Promise.race([promise, timeout]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

export const createDetailSlice: StateCreator<AppStore, [], [], DetailSlice> = (
  set,
  get,
) => ({
  detailFetchedAt: null,
  detailWarning: null,
  detail: null,
  detailLoading: false,
  detailRefreshing: false,
  detailError: null,
  detailCache: {},

  fetchDetail: async (fullName, force = false) => {
    const inFlight = detailInFlight.get(fullName);
    if (inFlight) {
      await inFlight;
      return;
    }
    const request = ++detailRequest;
    const run = (async () => {
      const revision = get().dataRevision;
      const alive = () =>
        request === detailRequest &&
        revision === get().dataRevision &&
        detailInFlight.get(fullName) === run;

      const applySaved = (saved: Saved<RepoDetail>, refreshing: boolean) => {
        const currentHistory = get().history;
        const next = saved.data;
        set((state) => ({
          detail: next,
          detailFetchedAt: saved.fetchedAt,
          detailWarning: saved.warning,
          detailError: null,
          detailLoading: false,
          detailRefreshing: refreshing,
          detailCache: { ...state.detailCache, [fullName]: saved },
          history: {
            ...currentHistory,
            [fullName]: {
              stars: next.starHistory ?? [],
              downloads: next.downloadHistory ?? [],
              forks: currentHistory[fullName]?.forks ?? [],
            },
          },
        }));
        void writeCache(
          DETAIL_CACHE_NAMESPACE,
          cacheKey(DETAIL_CACHE_NAMESPACE, fullName),
          {
            version: DETAIL_CACHE_VERSION,
            fetchedAt: saved.fetchedAt,
            data: saved.data,
            warning: saved.warning,
          },
        ).catch(() => {
          // Disk persistence is best-effort; the in-memory cache remains valid.
        });
      };

      let cached = get().detailCache[fullName];
      if (!cached) {
        try {
          const persisted = await withTimeout(
            readCache<RepoDetail>(
              DETAIL_CACHE_NAMESPACE,
              cacheKey(DETAIL_CACHE_NAMESPACE, fullName),
            ),
            10_000,
            "Detail cache",
          );
          if (persisted?.version === DETAIL_CACHE_VERSION) {
            cached = persisted;
            if (alive()) {
              set((state) => ({
                detailCache: { ...state.detailCache, [fullName]: persisted },
              }));
            }
          }
        } catch {
          // A corrupt/unavailable cache must not prevent the network request.
        }
      }

      if (cached) {
        const fresh = isCacheFresh(cached.fetchedAt, CACHE_TTL_MS.detail);
        applySaved(cached, force || !fresh);
        if (!force && fresh) return;
      } else {
        set({
          detail: null,
          detailError: null,
          detailWarning: null,
          detailFetchedAt: null,
          detailLoading: true,
          detailRefreshing: false,
        });
        set({ detailLoading: true, detailRefreshing: false });
      }

      try {
        const saved = await withTimeout(
          getRepoDetail(fullName),
          90000,
          "Repo detail",
        );
        if (!alive()) return;
        applySaved(saved, false);
      } catch (err) {
        if (!alive()) return;

        if (get().detail) {
          set({ detailLoading: false, detailRefreshing: false });
        } else {
          set({ detailError: String(err), detailLoading: false });
        }
      }
    })();
    detailInFlight.set(fullName, run);
    try {
      await run;
    } finally {
      if (detailInFlight.get(fullName) === run) detailInFlight.delete(fullName);
    }
  },

  clearDetail: () => {
    set({
      detail: null,
      detailError: null,
      // Keep the loading phase visible while the next detail is hydrated
      // from disk or fetched from the network.
      detailLoading: true,
      detailRefreshing: false,
      detailFetchedAt: null,
      detailWarning: null,
    });
  },
});
