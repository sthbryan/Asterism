import { readStoredTheme, readStoredTransparency } from "@/lib/appearance";
import { isValidBranchName } from "@/lib/git";
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
  GitSyncStatus,
  LocalCheckout,
  Locale,
  LocalState,
  PullListResult,
  PullRequestDetail,
  PullRequestSummary,
} from "@/lib/types";
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

const PULL_NOW = new Date("2026-09-12T12:00:00Z");
const mockPull = (
  repo: string,
  number: number,
  title: string,
  author: string,
  headRef: string,
  baseRef: string,
  options: Partial<PullRequestSummary> = {},
): PullRequestSummary => ({
  repo,
  number,
  title,
  author,
  headRef,
  baseRef,
  draft: false,
  state: "OPEN",
  createdAt: new Date(PULL_NOW.getTime() - number * 86400000).toISOString(),
  updatedAt: PULL_NOW.toISOString(),
  url: `https://github.com/${repo}/pull/${number}`,
  additions: 0,
  deletions: 0,
  changedFiles: 1,
  reviewDecision: null,
  checks: { passing: 2, failing: 0, pending: 0 },
  approvals: 0,
  changesRequested: 0,
  assignees: [],
  reviewRequests: [],
  ...options,
});

const MOCK_PULLS: PullRequestDetail[] = [
  {
    ...mockPull(
      "sthbryan/asterism",
      42,
      "Add the pull request inbox",
      "sthbryan",
      "feat/pull-inbox",
      "main",
      {
        additions: 342,
        deletions: 28,
        changedFiles: 12,
        reviewDecision: "REVIEW_REQUIRED",
        checks: { passing: 3, failing: 0, pending: 1 },
        reviewRequests: ["octocat"],
        assignees: ["sthbryan"],
      },
    ),
    body: "A focused inbox for the repositories you follow.",
    mergeable: "MERGEABLE",
    mergeState: "CLEAN",
    files: [
      { path: "src/features/pulls/index.tsx", additions: 180, deletions: 0 },
      { path: "src/services/api/types.ts", additions: 44, deletions: 2 },
    ],
  },
  {
    ...mockPull(
      "sthbryan/asterism",
      39,
      "Polish offline states",
      "octocat",
      "fix/offline",
      "main",
      {
        additions: 86,
        deletions: 19,
        changedFiles: 4,
        checks: { passing: 2, failing: 0, pending: 0 },
        approvals: 2,
        reviewDecision: "APPROVED",
      },
    ),
    body: "Keep saved data visible while reconnecting.",
    mergeable: "MERGEABLE",
    mergeState: "CLEAN",
    files: [{ path: "src/app/stores/boot.ts", additions: 86, deletions: 19 }],
  },
  {
    ...mockPull(
      "sthbryan/hyperion",
      18,
      "Handle retry-after headers",
      "sthbryan",
      "fix/rate-limit",
      "main",
      {
        additions: 21,
        deletions: 4,
        changedFiles: 2,
        checks: { passing: 1, failing: 1, pending: 0 },
        reviewDecision: "CHANGES_REQUESTED",
        changesRequested: 1,
      },
    ),
    body: "Respect the API limit when retrying requests.",
    mergeable: "CONFLICTING",
    mergeState: "DIRTY",
    files: [{ path: "src/gh.rs", additions: 21, deletions: 4 }],
  },
  {
    ...mockPull(
      "acme/nebula-api",
      7,
      "Document billing webhooks",
      "ada",
      "docs/webhooks",
      "main",
      {
        draft: true,
        additions: 120,
        deletions: 0,
        changedFiles: 8,
        checks: { passing: 0, failing: 0, pending: 2 },
        assignees: ["ada"],
      },
    ),
    body: "Draft documentation for the public webhook contract.",
    mergeable: null,
    mergeState: "BLOCKED",
    files: [{ path: "docs/webhooks.md", additions: 120, deletions: 0 }],
  },
  {
    ...mockPull(
      "acme/atlas-web",
      103,
      "Refresh dashboard dependencies",
      "lin",
      "deps/dashboard",
      "develop",
      {
        additions: 55,
        deletions: 55,
        changedFiles: 15,
        checks: { passing: 4, failing: 0, pending: 0 },
        approvals: 1,
        reviewDecision: "APPROVED",
      },
    ),
    body: "Update the dashboard dependency set.",
    mergeable: "MERGEABLE",
    mergeState: "CLEAN",
    files: [{ path: "package.json", additions: 55, deletions: 55 }],
  },
  {
    ...mockPull(
      "sthbryan/portfolio",
      12,
      "Fix navigation on small screens",
      "sthbryan",
      "fix/mobile-nav",
      "main",
      {
        state: "CLOSED",
        mergedAt: "2026-09-10T15:00:00Z",
        additions: 18,
        deletions: 7,
        changedFiles: 2,
        approvals: 1,
      },
    ),
    body: "Closed externally after the change was shipped separately.",
    mergeable: "MERGEABLE",
    mergeState: "CLEAN",
    files: [{ path: "src/mobile.ts", additions: 18, deletions: 7 }],
  },
];

const pullSavedAt = Math.floor(PULL_NOW.getTime() / 1000);
const mockCheckouts: Record<string, LocalCheckout[]> = {
  "sthbryan/asterism": [
    {
      fullName: "sthbryan/asterism",
      path: "/Users/demo/asterism",
      status: "ready",
      branch: "main",
      remoteUrl: "https://github.com/sthbryan/asterism.git",
    },
    {
      fullName: "sthbryan/asterism",
      path: "/Users/demo/asterism-old",
      status: "missing",
      branch: "main",
      remoteUrl: "https://github.com/sthbryan/asterism.git",
    },
  ],
};

const mockGitStore: Record<string, GitSyncStatus> = {};

function mockGitStatus(path: string): GitSyncStatus {
  const existing = mockGitStore[path];
  if (existing) return existing;
  const fresh: GitSyncStatus = {
    branch: "main",
    detached: false,
    head: "abc1234",
    localBranches: ["main", "feature"],
    remoteBranches: ["origin/main"],
    upstream: "origin/main",
    clean: true,
    staged: 0,
    unstaged: 0,
    untracked: 0,
    ahead: 1,
    behind: 0,
    lastFetch: Math.floor(Date.now() / 1000) - 3600,
  };
  mockGitStore[path] = fresh;
  return fresh;
}

const MOCK_DIAGNOSTICS: Diagnostics = {
  ghVersion: "gh version 2.74.2 (mock)",
  ghError: null,
  gitVersion: "git version 2.49.0 (mock)",
  gitError: null,
  configPath:
    "~/Library/Application Support/com.sthbryan.asterism/preferences.json",
  cachePath:
    "~/Library/Application Support/com.sthbryan.asterism/accounts/demo/cache.json",
  historyPath:
    "~/Library/Application Support/com.sthbryan.asterism/accounts/demo/history.json",
};

let cleared = false;
function localState(): LocalState {
  const empty = new URLSearchParams(window.location.search).has("empty");
  return {
    account: empty ? null : "github.com/sthbryan",
    config: { version: 1, repos: empty ? [] : [...mockRepos], ...appearance() },
    cache: empty || cleared ? null : cacheFor(mockRepos, MOCK_CACHE.fetchedAt),
    catalog:
      empty || cleared
        ? null
        : {
            fetchedAt: MOCK_CACHE.fetchedAt,
            data: [...MOCK_CATALOG],
            warning: null,
          },
    legacyAvailable: new URLSearchParams(window.location.search).has("legacy"),
    dataPath: "~/Library/Application Support/com.sthbryan.asterism",
  };
}
export const mockClient: ApiClient = {
  getLocalState: () => delay(localState(), 25),
  useLegacyData: () => delay({ ...localState(), account: "legacy" }),
  importLegacyData: () => delay({ ...localState(), legacyAvailable: false }),
  clearLocalCache: () => {
    cleared = true;
    return delay(localState());
  },
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
  getRepoDetail: (fullName, offline) => {
    if (
      offline &&
      (cleared || new URLSearchParams(window.location.search).has("empty"))
    )
      return Promise.reject("This detail has not been saved.");
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
        fetchedAt: offline
          ? MOCK_CACHE.fetchedAt
          : Math.floor(Date.now() / 1000),
        warning: null,
      },
      350,
    );
  },
  getCachedRepoDetail: () => delay(null, 25),
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
  listLocalCheckouts: () => delay(Object.values(mockCheckouts).flat()),
  linkLocalCheckout: (fullName, path) => {
    const checkout: LocalCheckout = {
      fullName,
      path,
      status: "ready",
      branch: "main",
      remoteUrl: `https://github.com/${fullName}.git`,
    };
    mockCheckouts[fullName] = [...(mockCheckouts[fullName] ?? []), checkout];
    return delay(checkout);
  },
  cloneLocalRepository: (fullName, parentPath, directoryName) => {
    const checkout: LocalCheckout = {
      fullName,
      path: `${parentPath}/${directoryName}`,
      status: "ready",
      branch: "main",
      remoteUrl: `https://github.com/${fullName}.git`,
    };
    mockCheckouts[fullName] = [...(mockCheckouts[fullName] ?? []), checkout];
    return delay(checkout, 600);
  },
  unlinkLocalCheckout: (fullName, path) => {
    mockCheckouts[fullName] = (mockCheckouts[fullName] ?? []).filter(
      (item) => item.path !== path,
    );
    return delay(undefined);
  },
  openLocalCheckout: () => delay(undefined),
  gitSyncStatus: (_fullName, path) => delay(mockGitStatus(path), 200),
  gitFetch: (_fullName, path) => {
    const status = mockGitStatus(path);
    status.lastFetch = Math.floor(Date.now() / 1000);
    return delay({ ...status }, 400);
  },
  gitPull: (_fullName, path) => {
    const status = mockGitStatus(path);
    if (status.detached) return Promise.reject("GIT_DETACHED");
    if (!status.upstream) return Promise.reject("GIT_NO_UPSTREAM");
    if (!status.clean) return Promise.reject("GIT_DIRTY");
    if ((status.ahead ?? 0) > 0 && (status.behind ?? 0) > 0)
      return Promise.reject("GIT_DIVERGED");
    return delay({ ...status, behind: 0 }, 400);
  },
  gitPush: (_fullName, path, setUpstream) => {
    const status = mockGitStatus(path);
    if (status.detached) return Promise.reject("GIT_DETACHED");
    if (!status.upstream && !setUpstream)
      return Promise.reject("GIT_NO_UPSTREAM");
    const next = {
      ...status,
      upstream: status.upstream ?? `origin/${status.branch ?? "main"}`,
      ahead: 0,
    };
    mockGitStore[path] = next;
    return delay({ ...next }, 400);
  },
  gitSwitchBranch: (_fullName, path, branch) => {
    const status = mockGitStatus(path);
    if (!status.localBranches.includes(branch))
      return Promise.reject("GIT_BRANCH_NOT_FOUND");
    if (!status.clean) return Promise.reject("GIT_DIRTY");
    const next = { ...status, branch, detached: false, ahead: 0, behind: 0 };
    mockGitStore[path] = next;
    return delay({ ...next }, 300);
  },
  gitCreateBranch: (_fullName, path, branch, switchTo) => {
    const status = mockGitStatus(path);
    if (!isValidBranchName(branch)) return Promise.reject("GIT_INVALID_BRANCH");
    if (status.localBranches.includes(branch))
      return Promise.reject("GIT_BRANCH_EXISTS");
    const next = {
      ...status,
      localBranches: [...status.localBranches, branch],
      branch: switchTo ? branch : status.branch,
    };
    mockGitStore[path] = next;
    return delay({ ...next }, 300);
  },
  chooseLocalFolder: () => delay("/Users/demo/projects"),
  listPullRequests: (repos, limit = 100, offline = false) => {
    const mode = new URLSearchParams(window.location.search).get("pulls");
    if (mode === "error" && !offline)
      return Promise.reject("GitHub unavailable");
    const requested = repos.length ? repos : mockRepos;
    const errors: Record<string, string> = {};
    if (mode === "partial" && requested.includes("acme/nebula-api"))
      errors["acme/nebula-api"] = "Permission denied for this repository.";
    const pulls = MOCK_PULLS.filter(
      (pull) => requested.includes(pull.repo) && !errors[pull.repo],
    ).slice(0, Math.max(1, Math.min(limit, 100)));
    const result: PullListResult = {
      pulls,
      errors,
      fetchedAt: offline ? pullSavedAt : Math.floor(Date.now() / 1000),
    };
    return delay(result, 420);
  },
  getPullRequest: (repo, number, offline = false) => {
    const mode = new URLSearchParams(window.location.search).get("pulls");
    if (mode === "error" && !offline)
      return Promise.reject("GitHub unavailable");
    const pull = MOCK_PULLS.find(
      (item) => item.repo === repo && item.number === number,
    );
    if (!pull)
      return Promise.reject("This pull request is not available locally.");
    return delay(
      {
        data: pull,
        fetchedAt: offline ? pullSavedAt : Math.floor(Date.now() / 1000),
        warning: null,
      },
      360,
    );
  },
  getPullDiff: (repo, number, offline = false) => {
    const mode = new URLSearchParams(window.location.search).get("pulls");
    if (mode === "error" && !offline)
      return Promise.reject("GitHub unavailable");
    const pull = MOCK_PULLS.find(
      (item) => item.repo === repo && item.number === number,
    );
    if (!pull)
      return Promise.reject("This pull request is not available locally.");
    const diff = pull.files
      .map(
        (file) =>
          `diff --git a/${file.path} b/${file.path}\n--- a/${file.path}\n+++ b/${file.path}\n@@ -1,1 +1,${Math.max(1, file.additions)} @@\n+Updated by Pull Request #${number}\n`,
      )
      .join("\n");
    return delay(
      {
        data: diff,
        fetchedAt: offline ? pullSavedAt : Math.floor(Date.now() / 1000),
        warning: null,
      },
      500,
    );
  },
};
