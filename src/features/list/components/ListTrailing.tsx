import { ArrowClockwiseIcon } from "@phosphor-icons/react";
import { IconButton } from "@zovaris/sephiro";
import { Case, Switch } from "react-if";
import { useI18n } from "@/app/hooks";
import { fmtFetched } from "@/lib/format";

export function ListTrailing({
  refreshing,
  fetchedAt,
  onRefresh,
}: {
  refreshing: boolean;
  fetchedAt: number | null;
  onRefresh: () => void;
}) {
  const { t, locale } = useI18n();
  const fetched = fmtFetched(fetchedAt);
  const updatedText = fetched
    ? t("list.updated", {
        value: fetchedAt
          ? new Intl.DateTimeFormat(locale, {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(fetchedAt * 1000)
          : fetched,
      })
    : null;
  return (
    <div className="flex items-center gap-1">
      <Switch>
        <Case condition={refreshing}>
          <span
            className="t-shimmer font-mono text-[12px] leading-none"
            data-text={t("Refreshing…")}
          >
            {t("Refreshing…")}
          </span>
        </Case>
        <Case condition={Boolean(fetched)}>
          <span className="inline-flex items-center gap-2 font-mono text-[12px] leading-none text-faint">
            {updatedText}
          </span>
        </Case>
      </Switch>
      <IconButton
        icon={
          <ArrowClockwiseIcon
            size={14}
            className={refreshing ? "animate-spin" : ""}
          />
        }
        label={t("Refresh")}
        size="sm"
        onClick={onRefresh}
        disabled={refreshing}
        title={t("Refresh")}
      />
    </div>
  );
}
