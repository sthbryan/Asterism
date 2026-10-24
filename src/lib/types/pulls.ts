export type PullChecks = {
  passing: number;
  failing: number;
  pending: number;
};

export type PullRequestSummary = {
  repo: string;
  number: number;
  title: string;
  author: string | null;
  headRef: string | null;
  baseRef: string | null;
  draft: boolean;
  state: string;
  createdAt: string | null;
  updatedAt: string | null;
  mergedAt?: string | null;
  url: string | null;
  additions: number;
  deletions: number;
  changedFiles: number;
  reviewDecision: string | null;
  checks: PullChecks;
  approvals: number;
  changesRequested: number;
  assignees: string[];
  reviewRequests: string[];
};

export type PullFile = {
  path: string;
  additions: number;
  deletions: number;
};

export type PullRequestDetail = PullRequestSummary & {
  body: string | null;
  mergeable: string | null;
  mergeState: string | null;
  files: PullFile[];
  diff?: string | null;
  diffFetchedAt?: number | null;
};

/** `text` is the beginning of the diff when `truncated` is true. */
export type PullDiff = {
  text: string;
  truncated: boolean;
};

export type PullRequestFilters = {
  repos?: string[];
  repo?: string | null;
  author?: string | null;
  assignee?: string | null;
  reviewRequested?: string | null;
  state?: string | null;
};

export type PullListResult = {
  pulls: PullRequestSummary[];
  errors: Record<string, string>;
  fetchedAt: number;
  page?: number;
  perPage?: number;
  total?: number;
  hasNextPage?: boolean;
  /** Repository -> cursor for its next page of pull requests. */
  cursors?: Record<string, string>;
};
