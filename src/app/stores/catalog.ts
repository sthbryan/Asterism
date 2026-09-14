import type { StateCreator } from "zustand";
import { listCatalog } from "@/services/api";
import type { AppStore } from "./types";

export type CatalogSlice = Pick<
  AppStore,
  | "catalogFetchedAt"
  | "catalog"
  | "catalogLoading"
  | "catalogError"
  | "loadCatalog"
>;

let catalogInFlight: Promise<void> | null = null;
let catalogRevision = -1;

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

  loadCatalog: () => {
    if (!get().status?.ok || get().connecting) return Promise.resolve();
    const revision = get().dataRevision;
    if (catalogInFlight && catalogRevision === revision) return catalogInFlight;
    catalogRevision = revision;
    set({ catalogLoading: true, catalogError: null });

    const request = (async () => {
      try {
        const rows = await listCatalog();
        if (revision === get().dataRevision)
          set({
            catalogLoading: false,
            catalog: rows,
            catalogFetchedAt: Math.floor(Date.now() / 1000),
          });
      } catch (err) {
        if (revision === get().dataRevision)
          set({ catalogLoading: false, catalogError: String(err) });
      } finally {
        if (catalogRevision === revision) catalogInFlight = null;
      }
    })();

    catalogInFlight = request;
    return request;
  },
});
