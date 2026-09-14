import type { StateCreator } from "zustand";
import {
  getLocalState,
  getStatus,
  refreshTracked,
  saveConfig,
} from "@/services/api";
import type { AppStore } from "./types";

let selectionRequest = 0;

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
    if (!get().status?.ok || get().connecting || get().refreshing) return;
    const revision = get().dataRevision;
    set({ refreshing: true, banner: null });
    try {
      const cache = await refreshTracked();
      if (revision !== get().dataRevision) return;
      set({
        refreshing: false,
        tracked: cache.repos,
        fetchedAt: cache.fetchedAt,
        history: cache.history ?? {},
      });
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
      // A local hydrate can happen while the write is in flight (for example
      // when boot finishes after the picker opened). Keep the confirmed write
      // for the same account, while ignoring stale responses from an older
      // request or a different account.
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
