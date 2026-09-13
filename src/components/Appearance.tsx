import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  applyDocumentAppearance,
  applyWindowChrome,
  readStoredTheme,
  readStoredTransparency,
  resolveTheme,
  saveAppearance,
  type ResolvedTheme,
} from "../lib/appearance";
import type { ThemePref } from "../lib/types";

type AppearanceValue = {
  theme: ThemePref;
  resolved: ResolvedTheme;
  transparency: boolean;
  setTheme: (theme: ThemePref) => void;
  setTransparency: (on: boolean) => void;
};

const AppearanceContext = createContext<AppearanceValue | null>(null);

export function AppearanceProvider({
  children,
  theme: themeFromConfig,
  transparency: transparencyFromConfig,
}: {
  children: ReactNode;
  theme?: ThemePref;
  transparency?: boolean;
}) {
  const [theme, setThemeState] = useState<ThemePref>(() => {
    const q = new URLSearchParams(window.location.search).get("theme");
    if (q === "light" || q === "dark" || q === "system") return q;
    return themeFromConfig ?? readStoredTheme();
  });
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
    if (transparencyFromConfig != null) setTransparencyState(transparencyFromConfig);
  }, [transparencyFromConfig]);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemDark(media.matches);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  const resolved: ResolvedTheme = theme === "system" ? (systemDark ? "dark" : "light") : theme;

  useEffect(() => {
    applyDocumentAppearance(theme, resolved, transparency);
    void applyWindowChrome(resolved, transparency);
  }, [theme, resolved, transparency]);

  const persist = useCallback((nextTheme: ThemePref, nextGlass: boolean) => {
    void saveAppearance(nextTheme, nextGlass);
  }, []);

  const setTheme = useCallback(
    (next: ThemePref) => {
      setThemeState(next);
      persist(next, transparency);
    },
    [persist, transparency],
  );

  const setTransparency = useCallback(
    (on: boolean) => {
      setTransparencyState(on);
      persist(theme, on);
    },
    [persist, theme],
  );

  const value = useMemo(
    () => ({ theme, resolved, transparency, setTheme, setTransparency }),
    [theme, resolved, transparency, setTheme, setTransparency],
  );

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>;
}

export function useAppearance() {
  const value = useContext(AppearanceContext);
  if (!value) {
    return {
      theme: "dark" as ThemePref,
      resolved: resolveTheme(readStoredTheme()),
      transparency: false,
      setTheme: () => undefined,
      setTransparency: () => undefined,
    };
  }
  return value;
}
