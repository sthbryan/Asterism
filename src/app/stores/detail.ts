import type { StateCreator } from "zustand";
import { CACHE_TTL_MS, cacheKey } from "@/lib/cache";
import { createResourceCache } from "@/lib/resourceCache";
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
const detailResources = createResourceCache<RepoDetail>(CACHE_TTL_MS.detail, {
  read: (_key, resource) =>
    readCache<RepoDetail>("detail", cacheKey("detail", resource)),
  write: (_key, entry, resource) =>
    writeCache("detail", cacheKey("detail", resource), entry),
});

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
    if (get().connecting || !get().status?.ok || !get().account) return;
    const request = ++detailRequest;
    const { account, dataRevision: revision } = get();
    const scope = `${revision}:${account}`;
    const isCurrent = () =>
      account === get().account && revision === get().dataRevision;
    const alive = () => request === detailRequest && isCurrent();
    const apply = (saved: Saved<RepoDetail>, refreshing: boolean) => {
      if (!alive()) return;
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
          ...state.history,
          [fullName]: {
            stars: next.starHistory ?? [],
            downloads: next.downloadHistory ?? [],
            forks: state.history[fullName]?.forks ?? [],
          },
        },
      }));
    };
    const cached = detailResources.peek(scope, fullName);
    set({
      detail: cached?.data ?? null,
      detailFetchedAt: cached?.fetchedAt ?? null,
      detailWarning: cached?.warning ?? null,
      detailError: null,
      detailLoading: !cached,
      detailRefreshing: Boolean(cached),
    });
    try {
      const saved = await detailResources.load(
        scope,
        fullName,
        () => getRepoDetail(fullName),
        {
          force,
          isCurrent,
          onCached: (saved) => apply(saved, true),
        },
      );
      apply(saved, false);
    } catch (err) {
      if (alive())
        set({
          detailLoading: false,
          detailRefreshing: false,
          detailError: get().detail ? null : String(err),
        });
    }
  },

  clearDetail: () => {
    detailRequest += 1;
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
