import type { StateCreator } from "zustand";
import type { RepoDetail, Saved } from "@/lib/types";
import { getRepoDetail } from "@/services/api";
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

  fetchDetail: async (fullName) => {
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
      };

      const memCached = get().detailCache[fullName];
      if (memCached) {
        applySaved(memCached, true);
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
