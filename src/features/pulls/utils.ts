import type {
  PullListResult,
  PullRequestDetail,
  PullRequestSummary,
} from "@/lib/types";

export type PullFilters = {
  query?: string;
  repo?: string;
  author?: string;
  assignee?: string;
  reviewer?: string;
  state?: string;
};

export function filterPullRequests(
  pulls: PullRequestSummary[],
  filters: PullFilters,
): PullRequestSummary[] {
  const needle = filters.query?.trim().toLowerCase() ?? "";
  return pulls.filter((pull) => {
    if (filters.repo && filters.repo !== "all" && pull.repo !== filters.repo)
      return false;
    if (
      filters.author &&
      filters.author !== "all" &&
      pull.author !== filters.author
    )
      return false;
    if (
      filters.assignee &&
      filters.assignee !== "all" &&
      !pull.assignees.includes(filters.assignee)
    )
      return false;
    if (
      filters.reviewer &&
      filters.reviewer !== "all" &&
      !pull.reviewRequests.includes(filters.reviewer)
    )
      return false;
    if (
      filters.state &&
      filters.state !== "all" &&
      (filters.state === "draft"
        ? !pull.draft
        : pull.state.toLowerCase() !== filters.state)
    )
      return false;
    if (
      needle &&
      !`${pull.repo} ${pull.title} ${pull.author ?? ""} ${pull.number}`
        .toLowerCase()
        .includes(needle)
    )
      return false;
    return true;
  });
}

/** A diff beyond this many files reads in GitHub, not in a side panel. */
export const INLINE_DIFF_MAX_FILES = 20;

export function canReadDiffInline(
  pull: PullRequestSummary | PullRequestDetail,
): boolean {
  return pull.changedFiles <= INLINE_DIFF_MAX_FILES;
}

export type DiffLineKind =
  | "file"
  | "meta"
  | "hunk"
  | "add"
  | "remove"
  | "context";

const META_PREFIXES = [
  "index ",
  "new file mode",
  "deleted file mode",
  "old mode",
  "new mode",
  "similarity index",
  "rename from",
  "rename to",
  "Binary files",
  "\\ No newline",
];

/** Classifies unified-diff lines so the panel can colour them like GitHub does. */
export function diffLineKind(line: string): DiffLineKind {
  if (line.startsWith("diff --git ")) return "file";
  if (line.startsWith("--- ") || line.startsWith("+++ ")) return "meta";
  if (line.startsWith("@@")) return "hunk";
  if (line.startsWith("+")) return "add";
  if (line.startsWith("-")) return "remove";
  if (META_PREFIXES.some((prefix) => line.startsWith(prefix))) return "meta";
  return "context";
}

export function pullPath(repo: string, number: number): string {
  return `/pull/${encodeURIComponent(repo)}/${number}`;
}

/**
 * Append a repository's next page without duplicating rows already listed.
 * Existing order is preserved so paging stays stable after loading more.
 */
export function appendPulls(
  existing: PullRequestSummary[],
  incoming: PullRequestSummary[],
): PullRequestSummary[] {
  if (incoming.length === 0) return existing;
  const seen = new Set(
    existing.map((pull) => `${pull.repo.toLowerCase()}#${pull.number}`),
  );
  const added = incoming.filter(
    (pull) => !seen.has(`${pull.repo.toLowerCase()}#${pull.number}`),
  );
  return added.length === 0 ? existing : [...existing, ...added];
}

/** Retain cached rows only for repositories that failed in this refresh. */
export function mergePullResults(
  fresh: PullListResult,
  previous?: PullListResult,
): PullListResult {
  const failed = new Set(
    Object.keys(fresh.errors).map((repo) => repo.toLowerCase()),
  );
  // A key without "owner/name" means the request itself failed (the backend's
  // "" or load-more's "all"): nothing arrived, so every saved row stays.
  const kept = Array.from(failed).some((key) => !key.includes("/"))
    ? (previous?.pulls ?? [])
    : (previous?.pulls.filter((pull) => failed.has(pull.repo.toLowerCase())) ??
      []);
  const pulls = [...fresh.pulls, ...kept];
  return { ...fresh, pulls, total: pulls.length };
}
