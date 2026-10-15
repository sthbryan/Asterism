import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  applyDocumentAppearance,
  applyWindowChrome,
  isThemePreset,
  type ResolvedTheme,
  readStoredPreset,
  readStoredTheme,
  readStoredTransparency,
  resolveTheme,
  saveAppearance,
} from "@/lib/appearance";
import type { ThemePref, ThemePreset } from "@/lib/types";

type AppearanceValue = {
  error: string | null;
  theme: ThemePref;
  resolved: ResolvedTheme;
  themePreset: ThemePreset;
  setThemePreset: (preset: ThemePreset) => void;
  transparency: boolean;
  setTheme: (theme: ThemePref) => void;
  setTransparency: (on: boolean) => void;
};

const AppearanceContext = createContext<AppearanceValue | null>(null);

export function AppearanceProvider({
  children,
  theme: themeFromConfig,
  themePreset: presetFromConfig,
  transparency: transparencyFromConfig,
}: {
  children: ReactNode;
  theme?: ThemePref;
  themePreset?: ThemePreset;
  transparency?: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [theme, setThemeState] = useState<ThemePref>(() => {
    const q = new URLSearchParams(window.location.search).get("theme");
    if (q === "light" || q === "dark" || q === "system") return q;
    return themeFromConfig ?? readStoredTheme();
  });
  const [themePreset, setPresetState] = useState<ThemePreset>(() => {
    const q = new URLSearchParams(window.location.search).get("preset");
    return isThemePreset(q) ? q : (presetFromConfig ?? readStoredPreset());
  });

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("preset");
    if (isThemePreset(q)) return;
    if (presetFromConfig) setPresetState(presetFromConfig);
  }, [presetFromConfig]);

  const [transparency, setTransparencyState] = useState(() => {
    const q = new URLSearchParams(window.location.search).get("glass");
    if (q === "1") return true;
    if (q === "0") return false;
    return transparencyFromConfig ?? readStoredTransparency();
  });
  const [systemDark, setSystemDark] = useState(
    () => window.matchMedia("(prefers-color-scheme: dark)").matches,
  );

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("theme");
    if (q === "light" || q === "dark" || q === "system") return;
    if (themeFromConfig) setThemeState(themeFromConfig);
  }, [themeFromConfig]);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("glass");
    if (q === "1" || q === "0") return;
    if (transparencyFromConfig != null)
      setTransparencyState(transparencyFromConfig);
  }, [transparencyFromConfig]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const resolved: ResolvedTheme =
    theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    applyDocumentAppearance(theme, resolved, transparency, themePreset);
    void applyWindowChrome(resolved, transparency);
  }, [theme, resolved, transparency, themePreset]);

  const persist = useCallback(
    (nextTheme: ThemePref, nextGlass: boolean, nextPreset: ThemePreset) => {
      setError(null);
      void saveAppearance(nextTheme, nextGlass, nextPreset).catch((err) =>
        setError(String(err)),
      );
    },
    [],
  );

  const setTheme = useCallback(
    (next: ThemePref) => {
      setThemeState(next);
      persist(next, transparency, themePreset);
    },
    [persist, transparency, themePreset],
  );

  const setTransparency = useCallback(
    (on: boolean) => {
      setTransparencyState(on);
      persist(theme, on, themePreset);
    },
    [persist, theme, themePreset],
  );

  const setThemePreset = useCallback(
    (next: ThemePreset) => {
      setPresetState(next);
      persist(theme, transparency, next);
    },
    [persist, theme, transparency],
  );

  const value = useMemo(
    () => ({
      theme,
      resolved,
      themePreset,
      setThemePreset,
      transparency,
      setTheme,
      setTransparency,
      error,
    }),
    [
      theme,
      resolved,
      themePreset,
      setThemePreset,
      transparency,
      setTheme,
      setTransparency,
      error,
    ],
  );

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
}

export function useAppearance() {
  const value = useContext(AppearanceContext);
  if (!value) {
    return {
      error: null,
      theme: "dark" as ThemePref,
      resolved: resolveTheme(readStoredTheme()),
      themePreset: readStoredPreset(),
      setThemePreset: () => undefined,
      transparency: false,
      setTheme: () => undefined,
      setTransparency: () => undefined,
    };
  }
  return value;
}
