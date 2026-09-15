import type { TplVars } from "@/lib/i18n";
import type { LocalCheckoutStatus } from "@/lib/types";

export const statusKey: Record<LocalCheckoutStatus, string> = {
  ready: "local.ready",
  missing: "local.missing",
  notGit: "local.notGit",
  remoteMismatch: "local.remoteMismatch",
  unavailable: "local.unavailable",
  gitUnavailable: "local.gitUnavailable",
};

const ERROR_CODES = [
  "LOCAL_CLONE_SAVED_FAILED",
  "LOCAL_CLONE_FAILED",
  "LOCAL_LINK_FAILED",
  "LOCAL_UNLINK_FAILED",
  "LOCAL_OPEN_FAILED",
  "LOCAL_FOLDER_FAILED",
  "LOCAL_INVALID_DIRECTORY",
  "LOCAL_DESTINATION_EXISTS",
  "LOCAL_INVALID_PATH",
  "LOCAL_GIT_UNAVAILABLE",
  "LOCAL_NOT_GIT",
  "LOCAL_REMOTE_MISMATCH",
  "LOCAL_CHECKOUT_UNAVAILABLE",
  "LOCAL_INVALID_TARGET",
  "LOCAL_EDITOR_UNAVAILABLE",
];

/** Maps backend `LOCAL_*` failures to translated messages. */
export function localError(
  error: unknown,
  t: (key: string, vars?: TplVars) => string,
) {
  const text = String(error);
  const code = ERROR_CODES.find((item) => text.includes(item));
  if (!code) return text;
  const message = t(`local.errors.${code}`);
  return code === "LOCAL_CLONE_SAVED_FAILED"
    ? `${message} ${text.replace(code, "").trim()}`
    : message;
}

/** Default clone folder name derived from `owner/repo`. */
export function suggestFolderName(fullName: string) {
  return fullName.split("/").slice(-1)[0] ?? "repository";
}
