export type Status = {
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
  cachePath: string;
  historyPath: string;
};
