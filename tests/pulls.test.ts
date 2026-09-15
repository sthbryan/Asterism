import { describe, expect, test } from "bun:test";
import {
  filterPullRequests,
  pageOf,
  pullPath,
} from "../src/features/pulls/utils";
import type { PullRequestSummary } from "../src/lib/types";

const pull = (
  overrides: Partial<PullRequestSummary> = {},
): PullRequestSummary => ({
  repo: "acme/app",
  number: 1,
  title: "Improve caching",
  author: "ada",
  headRef: "cache",
  baseRef: "main",
  draft: false,
  state: "OPEN",
  createdAt: null,
  updatedAt: null,
  url: null,
  additions: 1,
  deletions: 0,
  changedFiles: 1,
  reviewDecision: null,
  checks: { passing: 1, failing: 0, pending: 0 },
  approvals: 0,
  changesRequested: 0,
  assignees: ["ada"],
  reviewRequests: ["octocat"],
  ...overrides,
});

describe("pull request helpers", () => {
  test("filters by repository, reviewer and draft state", () => {
    const pulls = [
      pull(),
      pull({
        repo: "acme/web",
        number: 2,
        draft: true,
        reviewRequests: ["lin"],
      }),
    ];
    expect(
      filterPullRequests(pulls, { repo: "acme/web", state: "draft" }),
    ).toHaveLength(1);
    expect(filterPullRequests(pulls, { reviewer: "octocat" })).toHaveLength(1);
  });

  test("paginates safely and encodes repository names", () => {
    expect(pageOf([1, 2, 3], 2, 2)).toEqual({
      items: [3],
      pages: 2,
      currentPage: 2,
    });
    expect(pageOf([1], 99, 2).currentPage).toBe(1);
    expect(pullPath("owner/repo", 42)).toBe("/pull/owner%2Frepo/42");
  });
});
