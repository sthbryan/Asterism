import { WarningCircle } from "@phosphor-icons/react";
import { DetailSkeleton } from "../components/Skeleton";
import { useI18n } from "../lib/i18n";
import type { RepoDetail } from "../lib/types";
import { HistoryCharts } from "./detail/HistoryCharts";
import { InsightsSection } from "./detail/InsightsSection";
import { Kpis } from "./detail/Kpis";
import { MetaFacts } from "./detail/MetaFacts";
import { ReleasesTable } from "./detail/ReleasesTable";
import { RepoIntro } from "./detail/RepoIntro";
import { TrafficSection as TrafficSectionInner } from "./detail/TrafficSection";

export { DetailTitle, DetailTrailing } from "./detail/Header";

export function DetailView({
  loading,
  error,
  detail,
}: {
  loading: boolean;
  error: string | null;
  detail: RepoDetail | null;
}) {
  const { t } = useI18n();
  return loading ? (
    <DetailSkeleton />
  ) : (
    <div className="h-full min-h-0 overflow-auto px-6 pt-5 pb-6">
      {error ? (
        <div className="card flex items-start gap-3 p-5 text-[14px] text-accent-soft">
          <WarningCircle size={16} />
          <div role="alert">
            <p>{t("errors.request")}</p>
            <p className="mt-1 break-words">{error}</p>
          </div>
        </div>
      ) : detail ? (
        <DetailBody detail={detail} />
      ) : null}
    </div>
  );
}

function DetailBody({ detail }: { detail: RepoDetail }) {
  return (
    <div>
      <RepoIntro detail={detail} />
      <Kpis detail={detail} />
      <HistoryCharts detail={detail} />
      <TrafficSectionInner detail={detail} />
      <InsightsSection detail={detail} />
      <MetaFacts detail={detail} />
      <ReleasesTable detail={detail} />
    </div>
  );
}
