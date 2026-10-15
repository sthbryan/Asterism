import { useI18n } from "@/app/hooks";
import type { GitSyncStatus } from "@/lib/types";

export function GitSyncSummary({
  status,
  badge,
}: {
  status: GitSyncStatus;
  badge: string | null;
}) {
  const { t, locale } = useI18n();
  return (
    <>
      <dl className="space-y-1 text-[12px]">
        <div className="flex gap-2">
          <dt className="text-faint">{t("local.git.branch")}</dt>
          <dd className="font-medium">
            {status.detached
              ? `${t("local.git.detached")}${status.head ? ` · ${status.head}` : ""}`
              : (status.branch ?? "—")}
            {badge ? ` · ${badge}` : ""}
          </dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-faint">{t("local.git.upstream")}</dt>
          <dd>{status.upstream ?? "—"}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-faint">{t("local.git.changes")}</dt>
          <dd>
            {status.clean
              ? t("local.git.clean")
              : `${status.staged} ${t("local.git.staged")} · ${status.unstaged} ${t("local.git.unstaged")} · ${status.untracked} ${t("local.git.untracked")}`}
          </dd>
        </div>
      </dl>
      <p className="text-[12px] text-faint">
        {status.lastFetch
          ? t("local.git.lastFetch", {
              date: new Intl.DateTimeFormat(locale, {
                dateStyle: "medium",
                timeStyle: "short",
              }).format(status.lastFetch * 1000),
            })
          : t("local.git.neverFetched")}
      </p>
    </>
  );
}
