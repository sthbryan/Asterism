import { isValidBranchName } from "@/lib/git";
import type { GitSyncStatus, LocalCheckout } from "@/lib/types";
import { delay } from "./mockDelay";
import type { ApiClient } from "./types";

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

export const mockLocalClient: Pick<
  ApiClient,
  | "listLocalCheckouts"
  | "linkLocalCheckout"
  | "cloneLocalRepository"
  | "unlinkLocalCheckout"
  | "openLocalCheckout"
  | "gitSyncStatus"
  | "gitFetch"
  | "gitPull"
  | "gitPush"
  | "gitSwitchBranch"
  | "gitCreateBranch"
  | "chooseLocalFolder"
> = {
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
};
