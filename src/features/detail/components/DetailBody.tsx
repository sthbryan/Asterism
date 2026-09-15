import { When } from "react-if";
import { useI18n } from "@/app/hooks";
import { useStore } from "@/app/store";
import type { RepoDetail } from "@/lib/types";
import { HistoryCharts } from "./HistoryCharts";
import { InsightsSection } from "./InsightsSection";
import { Kpis } from "./Kpis";
import { LocalProjectsSection } from "./LocalProjectsSection";
import { MetaFacts } from "./MetaFacts";
import { ReleasesTable } from "./ReleasesTable";
import { RepoIntro } from "./RepoIntro";
import { TrafficSection as TrafficSectionInner } from "./TrafficSection";

export function DetailBody({
  detail,
  refreshing,
}: {
  detail: RepoDetail;
  refreshing: boolean;
}) {
  const { t, locale } = useI18n();
  const fetchedAt = useStore((s) => s.detailFetchedAt);
  const warning = useStore((s) => s.detailWarning);
  return (
    <div>
      <When condition={fetchedAt}>
        <p className="mb-3 flex items-center gap-2 text-xs text-mist">
          {t("offline.fetched", {
            date: new Intl.DateTimeFormat(locale, {
              dateStyle: "medium",
              timeStyle: "short",
            }).format((fetchedAt || 0) * 1000),
          })}
          {refreshing && (
            <span role="status" className="inline-flex items-center gap-1">
              <span
                aria-hidden
                className="inline-block size-3 animate-spin rounded-full border border-current border-t-transparent"
              />
              {t("Refreshing…")}
            </span>
          )}
        </p>
      </When>
      <When condition={warning}>
        <div role="status" className="mb-4 text-sm text-mist">
          <p>{t("offline.partial")}</p>
          <details>
            <summary>{t("Connection details")}</summary>
            <p className="mt-2 wrap-break-word">{warning}</p>
          </details>
        </div>
      </When>
      <RepoIntro detail={detail} />
      <LocalProjectsSection fullName={detail.fullName} />
      <Kpis detail={detail} referenceTs={fetchedAt ?? undefined} />
      <HistoryCharts detail={detail} referenceTs={fetchedAt ?? undefined} />
      <TrafficSectionInner detail={detail} />
      <InsightsSection detail={detail} />
      <MetaFacts detail={detail} />
      <ReleasesTable detail={detail} />
    </div>
  );
}
