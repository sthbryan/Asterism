import type { ReactNode } from "react";
import { create } from "zustand";
import { createBootSlice } from "./stores/boot";
import { createCatalogSlice } from "./stores/catalog";
import { createDetailSlice } from "./stores/detail";
import { createReposSlice } from "./stores/repos";
import type { AppStore } from "./stores/types";

export type { AppStore, StoreActions, StoreState } from "./stores/types";

export const useStore = create<AppStore>()((...args) => ({
  ...createBootSlice(...args),
  ...createReposSlice(...args),
  ...createCatalogSlice(...args),
  ...createDetailSlice(...args),
}));

export function StoreProvider({ children }: { children: ReactNode }) {
  return children;
}
