export type LocalCheckoutStatus =
  | "ready"
  | "missing"
  | "notGit"
  | "remoteMismatch"
  | "unavailable"
  | "gitUnavailable";

export type LocalCheckout = {
  fullName: string;
  path: string;
  status: LocalCheckoutStatus;
  branch: string | null;
  remoteUrl: string | null;
};

export type GitSyncStatus = {
  branch: string | null;
  detached: boolean;
  head: string | null;
  localBranches: string[];
  remoteBranches: string[];
  upstream: string | null;
  clean: boolean;
  staged: number;
  unstaged: number;
  untracked: number;
  ahead: number | null;
  behind: number | null;
  lastFetch: number | null;
};
