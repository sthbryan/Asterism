import { useI18n } from "@/app/hooks";
import type { GitSyncStatus } from "@/lib/types";

/**
 * One line for the whole checkout: where the branch sits, whether the tree is
 * movable, and when it last saw the remote. Three labelled rows said the same
 * thing with more air and no extra information.
 */
export function GitSyncSummary({
  status,
  badge,
}: {
  status: GitSyncStatus;
  badge: string | null;
}) {
  const { t, locale } = useI18n();
  const branch = status.detached
    ? `${t("local.git.detached")}${status.head ? ` · ${status.head}` : ""}`
    : (status.branch ?? "—");
  const changes = status.clean
    ? t("local.git.clean")
    : `${status.staged} ${t("local.git.staged")} · ${status.unstaged} ${t("local.git.unstaged")} · ${status.untracked} ${t("local.git.untracked")}`;
  const fetch = status.lastFetch
    ? t("local.git.lastFetch", {
        date: new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(status.lastFetch * 1000),
      })
    : t("local.git.neverFetched");

  return (
    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11.5px] text-faint">
      <span className="font-mono text-[12px] text-paper">{branch}</span>
      <span aria-hidden>→</span>
      <span className="font-mono text-[12px]">{status.upstream ?? "—"}</span>
      {badge ? <span>· {badge}</span> : null}
      <span aria-hidden>·</span>
      <span>{changes}</span>
      <span aria-hidden>·</span>
      <span>{fetch}</span>
    </p>
  );
}
