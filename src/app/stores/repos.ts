import type { StateCreator } from "zustand";
import { refreshTracked, saveConfig } from "../../services/api";
import type { AppStore } from "./types";

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

  runRefresh: async () => {
    set({ refreshing: true, banner: null });
    try {
      const cache = await refreshTracked();
      set({
        refreshing: false,
        tracked: cache.repos,
        fetchedAt: cache.fetchedAt,
        history: cache.history ?? {},
      });
    } catch (err) {
      set({ refreshing: false, banner: String(err) });
    }
  },

  persistSelection: async (repos) => {
    const previous = get().selectedNames;
    set({ selectedNames: repos, detail: null });
    try {
      const cfg = await saveConfig(repos);
      set({ selectedNames: cfg.repos });
      if (cfg.repos.length === 0) {
        set({ tracked: [], fetchedAt: null, history: {} });
        return;
      }
      await get().runRefresh();
    } catch (err) {
      set({ selectedNames: previous, banner: String(err) });
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
