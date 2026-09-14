import type { StateCreator } from "zustand";
import { getRepoDetail } from "@/services/api";
import type { AppStore } from "./types";

export type DetailSlice = Pick<
  AppStore,
  | "detailFetchedAt"
  | "detailWarning"
  | "detail"
  | "detailLoading"
  | "detailError"
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
  detailError: null,

  fetchDetail: async (fullName) => {
    const request = ++detailRequest;
    const revision = get().dataRevision;
    set({
      detail: null,
      detailError: null,
      detailWarning: null,
      detailFetchedAt: null,
      detailLoading: true,
    });
    try {
      const saved = await getRepoDetail(
        fullName,
        !get().status?.ok || get().connecting,
      );
      if (request !== detailRequest || revision !== get().dataRevision) return;
      const next = saved.data;
      const currentHistory = get().history;
      set({
        detail: next,
        detailFetchedAt: saved.fetchedAt,
        detailWarning: saved.warning,
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
      if (request !== detailRequest || revision !== get().dataRevision) return;
      set({ detailError: String(err), detailLoading: false });
    }
  },

  clearDetail: () => {
    ++detailRequest;
    set({
      detail: null,
      detailError: null,
      detailLoading: false,
      detailFetchedAt: null,
      detailWarning: null,
    });
  },
});
