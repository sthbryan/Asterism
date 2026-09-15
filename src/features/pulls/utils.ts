import type { PullRequestSummary } from "@/lib/types";

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

export function pullPath(repo: string, number: number): string {
  return `/pull/${encodeURIComponent(repo)}/${number}`;
}

export function pageOf<T>(items: T[], page: number, pageSize: number) {
  const pages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(page, 1), pages);
  return {
    items: items.slice((currentPage - 1) * pageSize, currentPage * pageSize),
    pages,
    currentPage,
  };
}
