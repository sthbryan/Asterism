import type { StateCreator } from "zustand";
import { readStoredTheme, readStoredTransparency } from "../../lib/appearance";
import {
  applyDocumentLocale,
  detectLocale,
  normalizeLocale,
  readStoredLocale,
} from "../../lib/i18n/locale";
import { saveLocale } from "../../services/api";
import type { AppStore } from "./types";

export type BootSlice = Pick<
  AppStore,
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

  bootOk: (status, config, cache) => {
    set({
      booted: true,
      status,
      selectedNames: config.repos,
      tracked: cache?.repos ?? [],
      fetchedAt: cache?.fetchedAt ?? null,
      history: cache?.history ?? {},
    });
  },

  bootFail: (status) => {
    set({ booted: true, status });
  },

  retryBoot: () => {
    set((state) => ({
      bootAttempt: state.bootAttempt + 1,
      booted: false,
      status: null,
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
