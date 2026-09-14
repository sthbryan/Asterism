import type { StateCreator } from "zustand";
import { getRepoDetail } from "../../lib/api";
import type { AppStore } from "./types";

export type DetailSlice = Pick<
  AppStore,
  "detail" | "detailLoading" | "detailError" | "fetchDetail" | "clearDetail"
>;

export const createDetailSlice: StateCreator<AppStore, [], [], DetailSlice> = (
  set,
  get,
) => ({
  detail: null,
  detailLoading: false,
  detailError: null,

  fetchDetail: async (fullName) => {
    set({ detail: null, detailError: null, detailLoading: true });
    try {
      const next = await getRepoDetail(fullName);
      const currentHistory = get().history;
      set({
        detail: next,
        detailLoading: false,
        history: {
          ...currentHistory,
          [fullName]: {
            stars: next.starHistory ?? [],
            downloads: next.downloadHistory ?? [],
            forks: currentHistory[fullName]?.forks ?? [],
          },
        },
      });
    } catch (err) {
      set({ detailError: String(err), detailLoading: false });
    }
  },

  clearDetail: () => {
    set({ detail: null, detailError: null, detailLoading: false });
  },
});
