import type { StateCreator } from "zustand";
import { listCatalog } from "../../services/api";
import type { AppStore } from "./types";

export type CatalogSlice = Pick<
  AppStore,
  "catalog" | "catalogLoading" | "catalogError" | "loadCatalog"
>;

let catalogInFlight: Promise<void> | null = null;

export const createCatalogSlice: StateCreator<
  AppStore,
  [],
  [],
  CatalogSlice
> = (set) => ({
  catalog: [],
  catalogLoading: false,
  catalogError: null,

  loadCatalog: () => {
    if (catalogInFlight) return catalogInFlight;
    set({ catalogLoading: true, catalogError: null });

    const request = (async () => {
      try {
        const rows = await listCatalog();
        set({ catalogLoading: false, catalog: rows });
      } catch (err) {
        set({ catalogLoading: false, catalogError: String(err) });
      } finally {
        catalogInFlight = null;
      }
    })();

    catalogInFlight = request;
    return request;
  },
});
