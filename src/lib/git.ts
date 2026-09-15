import type { GitSyncStatus } from "./types";

/**
 * Client-side branch name precheck for instant form feedback.
 * The backend validates authoritatively with `git check-ref-format`.
 */
export function isValidBranchName(name: string): boolean {
  const branch = name.trim();
  if (!branch || branch.length > 250 || branch === "HEAD" || branch === "@")
    return false;
  if (/[\s~^:?*[\]\\]/.test(branch)) return false;
  if (
    branch.startsWith("-") ||
    branch.startsWith("/") ||
    branch.startsWith(".") ||
    branch.endsWith("/") ||
    branch.endsWith(".") ||
    branch.endsWith(".lock")
  )
    return false;
  if (branch.includes("..") || branch.includes("//") || branch.includes("@{"))
    return false;
  if (branch.split("/").some((part) => part === "" || part === "."))
    return false;
  return true;
}

/** Where a push would go, and whether it would record a missing upstream. */
export function pushTarget(status: GitSyncStatus): {
  label: string;
  setsUpstream: boolean;
} {
  if (status.upstream) return { label: status.upstream, setsUpstream: false };
  const branch = status.branch ?? status.head ?? "";
  return { label: `origin/${branch}`, setsUpstream: true };
}

/** Compact ahead/behind badge text, or null when fully in sync. */
export function aheadBehindText(
  ahead: number | null,
  behind: number | null,
): string | null {
  const up = ahead ?? 0;
  const down = behind ?? 0;
  if (up === 0 && down === 0) return null;
  if (up > 0 && down === 0) return `↑${up}`;
  if (up === 0 && down > 0) return `↓${down}`;
  return `↑${up} ↓${down}`;
}
