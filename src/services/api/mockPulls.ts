import { MOCK_PULLS } from "@/lib/mock/pulls";
import type { PullListResult, PullRequestDetail, Saved } from "@/lib/types";
import { delay } from "./mockDelay";
import type { ApiClient } from "./types";

/** Small enough that the mock repository with several pull requests pages. */
const MOCK_PAGE = 2;

/** Cursors are `repo:offset`, mirroring the per-repository cursor the backend keeps. */
function pageFor(repo: string, cursor?: string) {
  const rows = MOCK_PULLS.filter((pull) => pull.repo === repo);
  const offset = Number.parseInt(cursor?.split(":").pop() ?? "0", 10) || 0;
  const pulls = rows.slice(offset, offset + MOCK_PAGE);
  const next =
    offset + MOCK_PAGE < rows.length ? `${repo}:${offset + MOCK_PAGE}` : null;
  return { pulls, next };
}

export function mockPullClient(
  repos: () => string[],
): Pick<
  ApiClient,
  | "refreshPullRequests"
  | "loadMorePullRequests"
  | "getPullRequest"
  | "getPullDiff"
> {
  return {
    refreshPullRequests: async (filters = {}) => {
      const requested = filters.repos ?? (filters.repo ? [filters.repo] : []);
      const mode = new URLSearchParams(window.location.search).get("pulls");
      if (mode === "error") return Promise.reject("GitHub unavailable");
      const selected = requested.length ? requested : repos();
      const errors: Record<string, string> = {};
      if (mode === "partial" && selected.includes("acme/nebula-api"))
        errors["acme/nebula-api"] = "Permission denied for this repository.";
      const cursors: Record<string, string> = {};
      const pulls = selected.flatMap((repo) => {
        if (errors[repo]) return [];
        const page = pageFor(repo);
        if (page.next) cursors[repo] = page.next;
        return page.pulls;
      });
      const result: PullListResult = {
        pulls,
        errors,
        fetchedAt: Math.floor(Date.now() / 1000),
        page: 1,
        perPage: MOCK_PAGE,
        total: pulls.length,
        hasNextPage: Object.keys(cursors).length > 0,
        cursors,
      };
      const saved: Saved<PullListResult> = {
        data: result,
        fetchedAt: result.fetchedAt,
        warning: null,
      };
      return delay(saved, 20);
    },
    loadMorePullRequests: (filters, cursors) => {
      const mode = new URLSearchParams(window.location.search).get("pulls");
      if (mode === "error") return Promise.reject("GitHub unavailable");
      const allowed = filters.repos?.length ? filters.repos : repos();
      const next: Record<string, string> = {};
      const pulls = Object.entries(cursors).flatMap(([repo, cursor]) => {
        if (!allowed.includes(repo)) return [];
        const page = pageFor(repo, cursor);
        if (page.next) next[repo] = page.next;
        return page.pulls;
      });
      const result: PullListResult = {
        pulls,
        errors: {},
        fetchedAt: Math.floor(Date.now() / 1000),
        page: 1,
        perPage: MOCK_PAGE,
        total: pulls.length,
        hasNextPage: Object.keys(next).length > 0,
        cursors: next,
      };
      return delay(result, 260);
    },
    getPullRequest: (repo, number) => {
      const mode = new URLSearchParams(window.location.search).get("pulls");
      if (mode === "error") return Promise.reject("GitHub unavailable");
      const pull = MOCK_PULLS.find(
        (item) => item.repo === repo && item.number === number,
      );
      if (!pull)
        return Promise.reject("This pull request is not available locally.");
      const saved = {
        data: pull,
        fetchedAt: Math.floor(Date.now() / 1000),
        warning: null,
      } satisfies Saved<PullRequestDetail>;
      return delay(saved, 360);
    },
    getPullDiff: (repo, number) => {
      const mode = new URLSearchParams(window.location.search).get("pulls");
      if (mode === "error") return Promise.reject("GitHub unavailable");
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
      const saved = {
        data: diff,
        fetchedAt: Math.floor(Date.now() / 1000),
        warning: null,
      } satisfies Saved<string>;
      return delay(saved, 500);
    },
  };
}
