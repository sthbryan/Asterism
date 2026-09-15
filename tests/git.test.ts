import { describe, expect, test } from "bun:test";
import { aheadBehindText, isValidBranchName, pushTarget } from "../src/lib/git";
import type { GitSyncStatus } from "../src/lib/types";

function status(partial: Partial<GitSyncStatus>): GitSyncStatus {
  return {
    branch: "main",
    detached: false,
    head: "abc1234",
    localBranches: ["main"],
    remoteBranches: ["origin/main"],
    upstream: "origin/main",
    clean: true,
    staged: 0,
    unstaged: 0,
    untracked: 0,
    ahead: 0,
    behind: 0,
    lastFetch: null,
    ...partial,
  };
}

describe("git helpers", () => {
  test("branch names reject empties, paths and ref syntax", () => {
    expect(isValidBranchName("")).toBe(false);
    expect(isValidBranchName("   ")).toBe(false);
    expect(isValidBranchName("HEAD")).toBe(false);
    expect(isValidBranchName("bad name")).toBe(false);
    expect(isValidBranchName("a..b")).toBe(false);
    expect(isValidBranchName("a//b")).toBe(false);
    expect(isValidBranchName("-wip")).toBe(false);
    expect(isValidBranchName(".hidden")).toBe(false);
    expect(isValidBranchName("feat.lock")).toBe(false);
    expect(isValidBranchName("a@{1}")).toBe(false);
    expect(isValidBranchName("a~1")).toBe(false);
    expect(isValidBranchName("a:b")).toBe(false);
  });

  test("branch names accept simple and hierarchical names", () => {
    expect(isValidBranchName("main")).toBe(true);
    expect(isValidBranchName("feature/login")).toBe(true);
    expect(isValidBranchName("release-1.2")).toBe(true);
    expect(isValidBranchName("  wip  ")).toBe(true);
  });

  test("push target shows upstream or the pending upstream", () => {
    expect(pushTarget(status({}))).toEqual({
      label: "origin/main",
      setsUpstream: false,
    });
    expect(pushTarget(status({ upstream: null, branch: "feat" }))).toEqual({
      label: "origin/feat",
      setsUpstream: true,
    });
  });

  test("ahead/behind badge compacts the sync state", () => {
    expect(aheadBehindText(0, 0)).toBe(null);
    expect(aheadBehindText(null, null)).toBe(null);
    expect(aheadBehindText(2, 0)).toBe("↑2");
    expect(aheadBehindText(0, 3)).toBe("↓3");
    expect(aheadBehindText(1, 2)).toBe("↑1 ↓2");
  });
});
