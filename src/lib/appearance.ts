import { invoke } from "@tauri-apps/api/core";
import type { Config, ThemePref } from "./types";

export type ResolvedTheme = "dark" | "light";

const THEME_KEY = "asterism:theme";
const GLASS_KEY = "asterism:transparency";

export function readStoredTheme(): ThemePref {
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    if (value === "light" || value === "system" || value === "dark") return value;
  } catch {
    /* ignore */
  }
  return "dark";
}

export function readStoredTransparency(): boolean {
  try {
    return window.localStorage.getItem(GLASS_KEY) === "1";
  } catch {
    return false;
  }
}

export function resolveTheme(pref: ThemePref): ResolvedTheme {
  if (pref === "system") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return pref;
}

export function applyDocumentAppearance(
  pref: ThemePref,
  resolved: ResolvedTheme,
  transparency: boolean,
) {
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.themePref = pref;
  root.dataset.transparency = transparency ? "on" : "off";
  root.style.colorScheme = resolved;
  persistThemePref(pref);
  try {
    window.localStorage.setItem(GLASS_KEY, transparency ? "1" : "0");
  } catch {
    /* ignore */
  }
}

export function persistThemePref(pref: ThemePref) {
  try {
    window.localStorage.setItem(THEME_KEY, pref);
    document.documentElement.dataset.themePref = pref;
  } catch {
    /* ignore */
  }
}

export async function applyWindowChrome(resolved: ResolvedTheme, transparency: boolean) {
  try {
    const { Effect, EffectState, getCurrentWindow } = await import("@tauri-apps/api/window");
    const win = getCurrentWindow();
    await win.setTheme(resolved);
    if (transparency) {
      await win.setBackgroundColor({ red: 0, green: 0, blue: 0, alpha: 0 });
      await win.setEffects({
        effects: resolved === "dark" ? [Effect.HudWindow] : [Effect.HeaderView, Effect.ContentBackground],
        state: EffectState.Active,
      });
    } else {
      await win.clearEffects();
      await win.setBackgroundColor(
        resolved === "dark"
          ? { red: 17, green: 17, blue: 17, alpha: 255 }
          : { red: 243, green: 243, blue: 243, alpha: 255 },
      );
    }
  } catch {
    /* browser / mock */
  }
}

export function saveAppearance(theme: ThemePref, transparency: boolean) {
  persistThemePref(theme);
  try {
    window.localStorage.setItem(GLASS_KEY, transparency ? "1" : "0");
  } catch {
    /* ignore */
  }
  return invoke<Config>("save_appearance", { theme, transparency }).catch(() => ({
    version: 1,
    repos: [],
    theme,
    transparency,
  }));
}
