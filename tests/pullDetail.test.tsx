import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { PullDetailBody } from "@/features/pulls/components/PullDetailBody";
import type { PullRequestDetail } from "@/lib/types";

const pull = (
  overrides: Partial<PullRequestDetail> = {},
): PullRequestDetail => ({
  repo: "acme/nebula-api",
  number: 42,
  title: "Harden the scheduler",
  author: "ada",
  headRef: "scheduler",
  baseRef: "main",
  draft: false,
  state: "OPEN",
  createdAt: "2026-10-20T10:00:00Z",
  updatedAt: "2026-10-21T10:00:00Z",
  url: "https://github.com/acme/nebula-api/pull/42",
  additions: 12,
  deletions: 4,
  changedFiles: 2,
  reviewDecision: null,
  checks: { passing: 2, failing: 0, pending: 0 },
  approvals: 0,
  changesRequested: 0,
  assignees: [],
  reviewRequests: [],
  body: null,
  mergeable: "MERGEABLE",
  mergeState: "CLEAN",
  files: [{ path: "src/scheduler.ts", additions: 12, deletions: 4 }],
  ...overrides,
});

function html(value: PullRequestDetail) {
  return renderToStaticMarkup(
    <PullDetailBody
      pull={value}
      warning={null}
      filesOpen={false}
      toggleFiles={() => undefined}
      diffOpen={false}
      toggleDiff={() => undefined}
      diff={null}
      diffLoading={false}
      diffRefreshing={false}
      diffError={null}
    />,
  );
}

describe("pull detail timestamps", () => {
  test("renders with no createdAt or updatedAt", () => {
    const out = html(pull({ createdAt: null, updatedAt: null }));
    expect(out).toContain("Harden the scheduler");
    expect(out).not.toContain("Updated");
  });

  test("skips a timestamp that is present but unparseable", () => {
    const out = html(pull({ createdAt: "not a date" }));
    expect(out).toContain("Harden the scheduler");
    expect(out).not.toContain("Updated");
  });

  test("still shows the age of a dated pull request", () => {
    expect(html(pull())).toContain("Updated");
  });
});
