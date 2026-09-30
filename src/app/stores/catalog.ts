import type { StateCreator } from "zustand";
import { listCatalog } from "@/services/api";
import { catalogCache } from "@/services/api/resources";
import type { AppStore } from "./types";

export type CatalogSlice = Pick<
  AppStore,
  | "catalogFetchedAt"
  | "catalog"
  | "catalogLoading"
  | "catalogError"
  | "loadCatalog"
>;

export const createCatalogSlice: StateCreator<
  AppStore,
  [],
  [],
  CatalogSlice
> = (set, get) => ({
  catalogFetchedAt: null,
  catalog: [],
  catalogLoading: false,
  catalogError: null,

  loadCatalog: async (force = false) => {
    if (!get().status?.ok || get().connecting || !get().account) return;
    const { account, dataRevision: revision } = get();
    const scope = `${revision}:${account}`;
    const current = () =>
      account === get().account && revision === get().dataRevision;
    set({ catalogLoading: true, catalogError: null });
    const apply = (rows: AppStore["catalog"], fetchedAt: number) => {
      if (current()) set({ catalog: rows, catalogFetchedAt: fetchedAt });
    };
    try {
      const saved = await catalogCache.load(
        scope,
        "catalog",
        async () => ({
          data: await listCatalog(),
          fetchedAt: Math.floor(Date.now() / 1_000),
          warning: null,
        }),
        {
          force,
          isCurrent: current,
          onCached: (saved) => apply(saved.data, saved.fetchedAt),
        },
      );
      apply(saved.data, saved.fetchedAt);
    } catch (err) {
      if (current())
        set({ catalogError: get().catalog.length ? null : String(err) });
    } finally {
      if (current()) set({ catalogLoading: false });
    }
  },
});
