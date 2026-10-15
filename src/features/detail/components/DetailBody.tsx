import { Collapsible, Spinner } from "@zovaris/sephiro";
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
          {t("list.updated", {
            value: new Intl.DateTimeFormat(locale, {
              dateStyle: "medium",
              timeStyle: "short",
            }).format((fetchedAt || 0) * 1000),
          })}
          <When condition={refreshing}>
            <span role="status" className="inline-flex items-center gap-1">
              <Spinner size="sm" />
              {t("Refreshing…")}
            </span>
          </When>
        </p>
      </When>
      <When condition={warning}>
        <div role="status" className="mb-4 text-sm text-mist">
          <p>{t("errors.request")}</p>
          <Collapsible
            className="[&_.sph-collapsible__trigger]:text-sm [&_.sph-collapsible__inner]:p-0"
            trigger={t("Connection details")}
          >
            <p className="mt-2 wrap-break-word">{warning}</p>
          </Collapsible>
        </div>
      </When>
      <RepoIntro detail={detail} />
      <LocalProjectsSection fullName={detail.fullName} />
      <Kpis detail={detail} />
      <HistoryCharts detail={detail} />
      <TrafficSectionInner detail={detail} />
      <InsightsSection detail={detail} />
      <MetaFacts detail={detail} />
      <ReleasesTable detail={detail} />
    </div>
  );
}
