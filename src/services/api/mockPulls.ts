import { MOCK_PULLS } from "@/lib/mock/pulls";
import type { PullListResult, PullRequestDetail, Saved } from "@/lib/types";
import { delay } from "./mockDelay";
import type { ApiClient } from "./types";

export function mockPullClient(
  repos: () => string[],
): Pick<ApiClient, "refreshPullRequests" | "getPullRequest" | "getPullDiff"> {
  return {
    refreshPullRequests: async (filters = {}) => {
      const requested = filters.repos ?? (filters.repo ? [filters.repo] : []);
      const mode = new URLSearchParams(window.location.search).get("pulls");
      if (mode === "error") return Promise.reject("GitHub unavailable");
      const selected = requested.length ? requested : repos();
      const errors: Record<string, string> = {};
      if (mode === "partial" && selected.includes("acme/nebula-api"))
        errors["acme/nebula-api"] = "Permission denied for this repository.";
      const pulls = MOCK_PULLS.filter(
        (pull) => selected.includes(pull.repo) && !errors[pull.repo],
      );
      const result: PullListResult = {
        pulls,
        errors,
        fetchedAt: Math.floor(Date.now() / 1000),
        page: 1,
        perPage: 100,
        total: pulls.length,
        hasNextPage: false,
      };
      const saved: Saved<PullListResult> = {
        data: result,
        fetchedAt: result.fetchedAt,
        warning: null,
      };
      return delay(saved, 20);
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
