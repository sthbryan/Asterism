const GIT_CODES = [
  "GIT_UNAVAILABLE",
  "GIT_NOT_GIT",
  "GIT_FAILED",
  "GIT_REMOTE_FAILED",
  "GIT_AUTH_FAILED",
  "GIT_DIRTY",
  "GIT_DIVERGED",
  "GIT_NO_UPSTREAM",
  "GIT_PUSH_REJECTED",
  "GIT_DETACHED",
  "GIT_BRANCH_EXISTS",
  "GIT_BRANCH_NOT_FOUND",
  "GIT_INVALID_BRANCH",
  "GIT_SWITCH_FAILED",
  "GIT_CREATE_FAILED",
];

const DETAIL_CODES = new Set([
  "GIT_REMOTE_FAILED",
  "GIT_AUTH_FAILED",
  "GIT_FAILED",
  "GIT_SWITCH_FAILED",
  "GIT_CREATE_FAILED",
]);

export function gitErrorCode(error: unknown): string | null {
  const text = String(error);
  return GIT_CODES.find((code) => text.includes(code)) ?? null;
}

/** Raw backend detail for codes that carry extra context, else "". */
export function gitErrorDetail(error: unknown): string {
  const code = gitErrorCode(error);
  if (!code || !DETAIL_CODES.has(code)) return "";
  return String(error)
    .replace(code, "")
    .replace(/^[:\s]+/, "");
}
