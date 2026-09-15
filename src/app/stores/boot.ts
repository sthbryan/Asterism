import type { StateCreator } from "zustand";
import { readStoredTheme, readStoredTransparency } from "@/lib/appearance";
import {
  applyDocumentLocale,
  detectLocale,
  normalizeLocale,
  readStoredLocale,
} from "@/lib/i18n/locale";
import { saveLocale } from "@/services/api";
import type { AppStore } from "./types";

export type BootSlice = Pick<
  AppStore,
  | "account"
  | "legacyAvailable"
  | "connecting"
  | "dataRevision"
  | "hydrateLocal"
  | "setConnecting"
  | "bootAttempt"
  | "booted"
  | "status"
  | "theme"
  | "transparency"
  | "locale"
  | "preferenceError"
  | "setPreferences"
  | "setPreferenceError"
  | "bootStart"
  | "bootOk"
  | "bootFail"
  | "retryBoot"
  | "setLocale"
>;

export const createBootSlice: StateCreator<AppStore, [], [], BootSlice> = (
  set,
) => ({
  account: null,
  legacyAvailable: false,
  connecting: true,
  dataRevision: 0,
  hydrateLocal: (local) =>
    set((state) => ({
      account: local.account,
      legacyAvailable: local.legacyAvailable,
      booted: true,
      selectedNames: local.config.repos,
      tracked: [],
      history: {},
      fetchedAt: null,
      catalog: [],
      catalogFetchedAt: null,
      catalogError: null,
      catalogLoading: false,
      detail: null,
      detailError: null,
      detailWarning: null,
      detailFetchedAt: null,
      detailLoading: false,
      detailRefreshing: false,
      refreshing: false,
      dataRevision: state.dataRevision + 1,
      banner: null,
    })),
  setConnecting: (connecting) => set({ connecting }),
  bootAttempt: 0,
  booted: false,
  status: null,
  theme: readStoredTheme(),
  transparency: readStoredTransparency(),
  locale: readStoredLocale() ?? detectLocale(),
  preferenceError: null,

  setPreferences: (config) => {
    set((state) => ({
      theme: config.theme ?? state.theme,
      transparency: Boolean(config.transparency),
      locale: config.locale ?? state.locale,
    }));
  },

  setPreferenceError: (error) => {
    set({ preferenceError: error });
  },

  bootStart: () => {
    set((state) => ({
      bootAttempt: state.bootAttempt + 1,
      booted: false,
    }));
  },

  bootOk: (status, config) => {
    set({
      booted: true,
      status,
      selectedNames: config.repos,
      tracked: [],
      fetchedAt: null,
      history: {},
    });
  },

  bootFail: (status) => {
    set({ booted: true, status, connecting: false });
  },

  retryBoot: () => {
    set((state) => ({
      bootAttempt: state.bootAttempt + 1,
      connecting: true,
      status: null,
      dataRevision: state.dataRevision + 1,
    }));
  },

  setLocale: async (locale) => {
    const next = normalizeLocale(locale);
    applyDocumentLocale(next);
    set({ locale: next, preferenceError: null });
    try {
      await saveLocale(next);
    } catch (err) {
      set({ preferenceError: String(err) });
    }
  },
});
