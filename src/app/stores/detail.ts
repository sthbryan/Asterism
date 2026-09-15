import type { StateCreator } from "zustand";
import type { RepoDetail, Saved } from "@/lib/types";
import { getCachedRepoDetail, getRepoDetail } from "@/services/api";
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

  fetchDetail: async (fullName) => {
    const request = ++detailRequest;
    const revision = get().dataRevision;
    const alive = () =>
      request === detailRequest && revision === get().dataRevision;

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
    };

    // 1. Instant path: in-memory cache from this session.
    const memCached = get().detailCache[fullName];
    if (memCached) {
      applySaved(memCached, true);
    } else {
      // 2. Fast path: persistent SQLite cache, no network.
      set({
        detail: null,
        detailError: null,
        detailWarning: null,
        detailFetchedAt: null,
        detailLoading: true,
        detailRefreshing: false,
      });
      try {
        const cached = await getCachedRepoDetail(fullName);
        if (!alive()) return;
        if (cached) applySaved(cached, true);
      } catch {
        // Cache miss/errors fall through to the network fetch below.
      }
      if (!alive()) return;
      set(
        get().detail
          ? { detailLoading: false, detailRefreshing: true }
          : { detailLoading: true, detailRefreshing: false },
      );
    }

    // 3. Background refresh: network fetch, UI updates when ready.
    try {
      const saved = await getRepoDetail(
        fullName,
        !get().status?.ok || get().connecting,
      );
      if (!alive()) return;
      applySaved(saved, false);
    } catch (err) {
      if (!alive()) return;
      // Keep stale content visible; only hard-fail when we have nothing.
      if (get().detail) {
        set({ detailLoading: false, detailRefreshing: false });
      } else {
        set({ detailError: String(err), detailLoading: false });
      }
    }
  },

  clearDetail: () => {
    ++detailRequest;
    set({
      detail: null,
      detailError: null,
      detailLoading: false,
      detailRefreshing: false,
      detailFetchedAt: null,
      detailWarning: null,
    });
  },
});
