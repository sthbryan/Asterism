import { WarningCircle } from "@phosphor-icons/react";
import { useRoute } from "wouter";
import { useDetail } from "../../app/hooks";
import { decodeDetailParam } from "../../app/routes";
import { useTransitionNavigate } from "../../app/useViewTransition";
import { PageHeader } from "../../components/PageHeader";
import { DetailSkeleton } from "../../components/Skeleton";
import { useI18n } from "../../lib/i18n";
import type { RepoDetail } from "../../lib/types";
import { DetailTitle, DetailTrailing } from "./Header";
import { HistoryCharts } from "./HistoryCharts";
import { InsightsSection } from "./InsightsSection";
import { Kpis } from "./Kpis";
import { MetaFacts } from "./MetaFacts";
import { ReleasesTable } from "./ReleasesTable";
import { RepoIntro } from "./RepoIntro";
import { TrafficSection as TrafficSectionInner } from "./TrafficSection";

export function DetailView() {
  const [, params] = useRoute("/repo/:fullName");
  const navigate = useTransitionNavigate();
  const fullName = decodeDetailParam(params?.fullName);

  const { detail, loading, error } = useDetail(fullName);

  return (
    <>
      <PageHeader
        title={
          <DetailTitle
            fullName={fullName}
            onBack={() => {
              navigate("/");
            }}
          />
        }
        trailing={<DetailTrailing fullName={fullName} />}
      />
      <div className={`t-skel h-full ${loading ? "" : "is-revealed"}`}>
        <div className="t-skel-skeleton is-pulsing">
          <DetailSkeleton />
        </div>
        <div className="t-skel-content">
          <DetailContent error={error} detail={detail} />
        </div>
      </div>
    </>
  );
}

function DetailContent({
  error,
  detail,
}: {
  error: string | null;
  detail: RepoDetail | null;
}) {
  const { t } = useI18n();

  return (
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
