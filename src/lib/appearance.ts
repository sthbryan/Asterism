import { invoke } from "@tauri-apps/api/core";
import { enqueuePreference } from "./preferences";
import type { Config, ThemePref, ThemePreset } from "./types";

export type ResolvedTheme = "dark" | "light";

const THEME_KEY = "asterism:theme";
const PRESET_KEY = "asterism:theme-preset";
const GLASS_KEY = "asterism:transparency";

export function readStoredTheme(): ThemePref {
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    if (value === "light" || value === "system" || value === "dark")
      return value;
  } catch {
    /* ignore */
  }
  return "dark";
}

export function isThemePreset(value: unknown): value is ThemePreset {
  return (
    value === "asterism" ||
    value === "default" ||
    value === "fizza" ||
    value === "pulso"
  );
}

export function readStoredPreset(): ThemePreset {
  try {
    const value = window.localStorage.getItem(PRESET_KEY);
    if (isThemePreset(value)) return value;
  } catch {
    /* ignore */
  }
  return "asterism";
}

export function presetSupportsMode(preset: ThemePreset) {
  return isThemePreset(preset);
}

export function sephiroTheme(preset: ThemePreset, resolved: ResolvedTheme) {
  return preset === "default" ? resolved : preset;
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
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return pref;
}

export function applyDocumentAppearance(
  pref: ThemePref,
  resolved: ResolvedTheme,
  transparency: boolean,
  preset: ThemePreset = "asterism",
) {
  const root = document.documentElement;
  root.dataset.theme = resolved;
  root.dataset.sephiroTheme = sephiroTheme(preset, resolved);
  root.dataset.themePref = pref;
  root.dataset.transparency = transparency ? "on" : "off";
  root.style.colorScheme = resolved;
  persistThemePref(pref);
  try {
    window.localStorage.setItem(GLASS_KEY, transparency ? "1" : "0");
    window.localStorage.setItem(PRESET_KEY, preset);
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

export async function applyWindowChrome(
  resolved: ResolvedTheme,
  transparency: boolean,
) {
  if (!("__TAURI_INTERNALS__" in window)) return;
  try {
    const { Effect, EffectState, getCurrentWindow } =
      await import("@tauri-apps/api/window");
    const win = getCurrentWindow();
    await win.setTheme(resolved);
    if (transparency) {
      await win.setBackgroundColor({ red: 0, green: 0, blue: 0, alpha: 0 });
      await win.setEffects({
        effects:
          resolved === "dark"
            ? [Effect.HudWindow]
            : [Effect.HeaderView, Effect.ContentBackground],
        state: EffectState.Active,
      });
    } else {
      await win.clearEffects();
      const background = getComputedStyle(document.documentElement)
        .getPropertyValue("--sph-bg")
        .trim();
      const hex = /^#[0-9a-f]{6}$/i.test(background)
        ? background
        : resolved === "dark"
          ? "#111111"
          : "#f3f3f3";
      await win.setBackgroundColor({
        red: Number.parseInt(hex.slice(1, 3), 16),
        green: Number.parseInt(hex.slice(3, 5), 16),
        blue: Number.parseInt(hex.slice(5, 7), 16),
        alpha: 255,
      });
    }
  } catch {
    /* browser / mock */
  }
}

export function saveAppearance(
  theme: ThemePref,
  transparency: boolean,
  preset: ThemePreset,
) {
  persistThemePref(theme);
  try {
    window.localStorage.setItem(GLASS_KEY, transparency ? "1" : "0");
    window.localStorage.setItem(PRESET_KEY, preset);
  } catch {
    /* ignore */
  }
  if (!("__TAURI_INTERNALS__" in window))
    return Promise.resolve({
      version: 1,
      repos: [],
      theme,
      transparency,
      themePreset: preset,
    });
  return enqueuePreference(() =>
    invoke<Config>("save_appearance", {
      theme,
      transparency,
      themePreset: preset,
    }),
  );
}
