import { create } from "zustand";
import { createBootSlice } from "@/app/stores/boot";
import { createCatalogSlice } from "@/app/stores/catalog";
import { createDetailSlice } from "@/app/stores/detail";
import { createReposSlice } from "@/app/stores/repos";
import type { AppStore } from "@/app/stores/types";

export type { AppStore, StoreActions, StoreState } from "@/app/stores/types";

export const useStore = create<AppStore>()((...args) => ({
  ...createBootSlice(...args),
  ...createReposSlice(...args),
  ...createCatalogSlice(...args),
  ...createDetailSlice(...args),
}));
