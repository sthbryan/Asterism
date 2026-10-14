import { readStoredTheme, readStoredTransparency } from "@/lib/appearance";
import {
  detectLocale,
  persistLocale,
  readStoredLocale,
} from "@/lib/i18n/locale";
import {
  MOCK_CACHE,
  MOCK_CATALOG,
  MOCK_CONFIG,
  MOCK_CREATE_OPTIONS,
  MOCK_STATUS,
  mockCreateRepo,
  mockDetail,
} from "@/lib/mock";
import type {
  Cache,
  Config,
  Diagnostics,
  Locale,
  LocalState,
  PersistentCache,
} from "@/lib/types";
import { delay } from "./mockDelay";
import { mockLocalClient } from "./mockLocal";
import { mockPullClient } from "./mockPulls";
import type { ApiClient } from "./types";

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
const mockPersistentCache = new Map<string, PersistentCache<unknown>>();

const MOCK_DIAGNOSTICS: Diagnostics = {
  ghVersion: "gh version 2.74.2 (mock)",
  ghError: null,
  gitVersion: "git version 2.49.0 (mock)",
  gitError: null,
  configPath:
    "~/Library/Application Support/com.sthbryan.asterism/preferences.json",
  historyPath:
    "~/Library/Application Support/com.sthbryan.asterism/accounts/demo/history.json",
};

function localState(): LocalState {
  const empty = new URLSearchParams(window.location.search).has("empty");
  return {
    account: empty ? null : "github.com/sthbryan",
    config: { version: 1, repos: empty ? [] : [...mockRepos], ...appearance() },
    legacyAvailable: new URLSearchParams(window.location.search).has("legacy"),
  };
}
export const mockClient: ApiClient = {
  readCache: <T>(namespace: string, key: string) =>
    delay(
      (mockPersistentCache.get(`${namespace}:${key}`) as PersistentCache<T>) ??
        null,
      20,
    ),
  writeCache: <T>(
    namespace: string,
    key: string,
    entry: PersistentCache<T>,
  ) => {
    mockPersistentCache.set(`${namespace}:${key}`, entry);
    return delay(undefined, 20);
  },
  getLocalState: () => delay(localState(), 25),
  useLegacyData: () => delay({ ...localState(), account: "legacy" }),
  importLegacyData: () => delay({ ...localState(), legacyAvailable: false }),
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
  listCatalog: () => delay([...MOCK_CATALOG], 400),
  listCreateOptions: () => delay({ ...MOCK_CREATE_OPTIONS }, 280),
  createRepo: (input) => delay(mockCreateRepo(input), 500),
  refreshTracked: () =>
    delay(cacheFor(mockRepos, Math.floor(Date.now() / 1000)), 600),
  getRepoDetail: (fullName) => {
    const mode = new URLSearchParams(window.location.search).get("traffic");
    const base = mockDetail(fullName);
    const old = Math.floor(Date.now() / 1000) - 10 * 86400;
    const data = { ...base };
    if (mode === "forbidden" || mode === "error" || mode === "empty") {
      data.views = null;
      data.clones = null;
      data.viewsStatus =
        mode === "forbidden"
          ? "forbidden"
          : mode === "error"
            ? "error"
            : "unavailable";
      data.clonesStatus = data.viewsStatus;
      data.trafficError =
        mode === "forbidden"
          ? "HTTP 403: Forbidden"
          : mode === "error"
            ? "Network error"
            : null;
    } else if (mode === "partial") {
      data.views = null;
      data.viewsStatus = "forbidden";
      data.clonesStatus = "ok";
      data.trafficError = "HTTP 403: Forbidden";
    } else if (mode === "zero") {
      data.views = { count: 0, uniques: 0, days: [] };
      data.clones = { count: 0, uniques: 0, days: [] };
      data.viewsStatus = "ok";
      data.clonesStatus = "ok";
      data.trafficError = null;
    } else if (mode === "old") {
      if (data.views)
        data.views = {
          ...data.views,
          fetchedAt: old,
          sampleFrom: old - 13 * 86400,
          sampleTo: old,
        };
      if (data.clones)
        data.clones = {
          ...data.clones,
          fetchedAt: old,
          sampleFrom: old - 13 * 86400,
          sampleTo: old,
        };
      data.viewsStatus = "ok";
      data.clonesStatus = "ok";
    }
    return delay(
      {
        data,
        fetchedAt: Math.floor(Date.now() / 1000),
        warning: null,
      },
      350,
    );
  },
  ...mockPullClient(() => mockRepos),
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
  getCacheInfo: () =>
    delay({
      path: "/mock/application-support/asterism/accounts/demo/cache.json",
      entries: mockPersistentCache.size,
      bytes: JSON.stringify([...mockPersistentCache]).length,
    }),
  clearCache: () => {
    const count = mockPersistentCache.size;
    mockPersistentCache.clear();
    return delay(count);
  },
  ...mockLocalClient,
};
