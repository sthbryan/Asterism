import { Case, Switch, When } from "react-if";
import { useI18n } from "@/app/hooks";

export function PullCacheStatus({
  fetchedAt,
  refreshing,
  offline,
}: {
  fetchedAt: number | null;
  refreshing: boolean;
  offline: boolean;
}) {
  const { t, formatDate } = useI18n();
  const date = formatDate((fetchedAt ?? 0) * 1000, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  return (
    <When condition={Boolean(fetchedAt)}>
      <p className="mb-3 flex items-center gap-2 text-xs text-mist">
        <Switch>
          <Case condition={offline}>{t("pulls.offline", { date })}</Case>
          <Case condition={!offline}>{t("offline.fetched", { date })}</Case>
        </Switch>
        <When condition={refreshing}>
          <span role="status" className="inline-flex items-center gap-1">
            <span
              aria-hidden
              className="inline-block size-3 animate-spin rounded-full border border-current border-t-transparent"
            />
            {t("Refreshing…")}
          </span>
        </When>
      </p>
    </When>
  );
}
