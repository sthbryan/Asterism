export type Status = {
  kind?: "storage";
  ok: boolean;
  login: string | null;
  error: string | null;
  hint: string | null;
};

export type ThemePref = "dark" | "light" | "system";

export type Locale = "es" | "en";

export type Config = {
  version: number;
  repos: string[];
  theme?: ThemePref;
  transparency?: boolean;
  locale?: Locale;
};

export type Diagnostics = {
  ghVersion: string | null;
  ghError: string | null;
  gitVersion: string | null;
  gitError: string | null;
  configPath: string;
  historyPath: string;
};

export type Saved<T> = { fetchedAt: number; data: T; warning: string | null };
export type LocalState = {
  account: string | null;
  config: Config;
  legacyAvailable: boolean;
};
