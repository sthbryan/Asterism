import { readStoredTheme, readStoredTransparency } from "../../lib/appearance";
import {
  detectLocale,
  persistLocale,
  readStoredLocale,
} from "../../lib/i18n/locale";
import {
  MOCK_CACHE,
  MOCK_CATALOG,
  MOCK_CONFIG,
  MOCK_CREATE_OPTIONS,
  MOCK_STATUS,
  mockCreateRepo,
  mockDetail,
} from "../../lib/mock";
import type { Cache, Config, Diagnostics, Locale } from "../../lib/types";
import type { ApiClient } from "./types";

function delay<T>(value: T, ms = 250): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function appearance(): Pick<Config, "theme" | "transparency" | "locale"> {
  return {
    theme: readStoredTheme(),
    transparency: readStoredTransparency(),
    locale: readStoredLocale() ?? detectLocale(),
  };
}

function cacheFor(repos: string[], fetchedAt: number): Cache {
  const selected = MOCK_CACHE.repos.filter((repo) =>
    repos.includes(repo.fullName),
  );
  const history = Object.fromEntries(
    selected
      .map((repo) => [repo.fullName, MOCK_CACHE.history[repo.fullName]])
      .filter(([, historyEntry]) => historyEntry),
  );
  return { fetchedAt, repos: selected, history };
}

let mockRepos = [...MOCK_CONFIG.repos];

const MOCK_DIAGNOSTICS: Diagnostics = {
  ghVersion: "gh version 2.74.2 (mock)",
  ghError: null,
  gitVersion: "git version 2.49.0 (mock)",
  gitError: null,
  configPath: "~/.config/asterism/config.json",
  cachePath: "~/.cache/asterism/cache.json",
  historyPath: "~/.cache/asterism/history.json",
};

export const mockClient: ApiClient = {
  getStatus: () => {
    const setup = new URLSearchParams(window.location.search).get("setup");
    if (setup === "missing" || setup === "auth" || setup === "network") {
      return delay({
        ok: false,
        login: null,
        hint: null,
        error:
          setup === "missing"
            ? "GitHub CLI (gh) was not found on this machine."
            : setup === "auth"
              ? "GitHub CLI is not authenticated."
              : "Could not connect to api.github.com.",
      });
    }
    return delay({ ...MOCK_STATUS });
  },
  getConfig: () =>
    delay({ version: 1, repos: [...mockRepos], ...appearance() }),
  saveConfig: (repos) => {
    mockRepos = [...repos];
    return delay({ version: 1, repos: [...mockRepos], ...appearance() });
  },
  getCache: () => delay(cacheFor(mockRepos, MOCK_CACHE.fetchedAt)),
  listCatalog: () => delay([...MOCK_CATALOG], 400),
  listCreateOptions: () => delay({ ...MOCK_CREATE_OPTIONS }, 280),
  createRepo: (input) => delay(mockCreateRepo(input), 500),
  refreshTracked: () =>
    delay(cacheFor(mockRepos, Math.floor(Date.now() / 1000)), 600),
  getRepoDetail: (fullName) => delay(mockDetail(fullName), 350),
  saveLocale: (locale: Locale) => {
    persistLocale(locale);
    return delay({
      version: 1,
      repos: [...mockRepos],
      ...appearance(),
      locale,
    });
  },
  getDiagnostics: () => {
    const missing =
      new URLSearchParams(window.location.search).get("setup") === "missing";
    return delay({
      ...MOCK_DIAGNOSTICS,
      ghVersion: missing ? null : MOCK_DIAGNOSTICS.ghVersion,
      ghError: missing ? "gh was not found on this machine." : null,
    });
  },
};
