import { describe, expect, test } from "bun:test";
import {
  appendPulls,
  canReadDiffInline,
  diffLineKind,
  filterPullRequests,
  mergePullResults,
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

  test("encodes repository names in pull paths", () => {
    expect(pullPath("owner/repo", 42)).toBe("/pull/owner%2Frepo/42");
  });

  test("only small pull requests get an inline diff", () => {
    expect(canReadDiffInline(pull({ changedFiles: 3 }))).toBe(true);
    expect(canReadDiffInline(pull({ changedFiles: 100 }))).toBe(false);
  });
});

test("classifies unified diff lines for colouring", () => {
  expect(diffLineKind("diff --git a/src/a.ts b/src/a.ts")).toBe("file");
  expect(diffLineKind("index 8341f78..b1ec3a 100644")).toBe("meta");
  expect(diffLineKind("--- a/src/a.ts")).toBe("meta");
  expect(diffLineKind("+++ b/src/a.ts")).toBe("meta");
  expect(diffLineKind("@@ -39,11 +39,6 @@ jobs:")).toBe("hunk");
  expect(diffLineKind("+  name: Setup Bun")).toBe("add");
  expect(diffLineKind("-  name: Setup Bun")).toBe("remove");
  expect(diffLineKind("\n")).toBe("context");
  expect(diffLineKind("   unchanged context")).toBe("context");
});

test("a loaded page appends after the existing rows without duplicates", () => {
  const first = [pull({ number: 5 }), pull({ repo: "acme/web", number: 2 })];
  const next = [
    pull({ number: 4 }),
    pull({ repo: "ACME/WEB", number: 1 }),
    pull({ number: 5 }),
  ];
  const merged = appendPulls(first, next);
  expect(merged.map((row) => `${row.repo}#${row.number}`)).toEqual([
    "acme/app#5",
    "acme/web#2",
    "acme/app#4",
    "ACME/WEB#1",
  ]);
  expect(appendPulls(first, [])).toBe(first);
  expect(appendPulls(first, [pull({ number: 5 })])).toBe(first);
});

test("partial PR failures retain saved rows while successful empty repositories stay empty", () => {
  const previous = {
    pulls: [pull(), pull({ repo: "acme/web", number: 2 })],
    errors: {},
    fetchedAt: 1,
  };
  const fresh = { pulls: [], errors: { "ACME/APP": "timeout" }, fetchedAt: 2 };
  const merged = mergePullResults(fresh, previous);
  expect(merged.pulls.map((pull) => pull.repo)).toEqual(["acme/app"]);
  expect(merged.errors).toEqual(fresh.errors);
  expect(merged.total).toBe(1);
});

test("a whole-request failure keeps every saved row", () => {
  const previous = {
    pulls: [pull(), pull({ repo: "acme/web", number: 2 })],
    errors: {},
    fetchedAt: 1,
  };
  const fresh = {
    pulls: [],
    errors: {
      "": "Could not parse gh JSON: expected value at line 1 column 1",
    },
    fetchedAt: 2,
  };
  const merged = mergePullResults(fresh, previous);
  expect(merged.pulls).toHaveLength(2);
  expect(merged.errors).toEqual(fresh.errors);
});
