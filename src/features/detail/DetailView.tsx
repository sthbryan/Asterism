import { WarningCircle } from "@phosphor-icons/react";
import { useState } from "react";
import { useRoute } from "wouter";
import { useDetail, useI18n } from "@/app/hooks";
import { decodeDetailParam } from "@/app/routes";
import { useStore } from "@/app/store";
import { useTransitionNavigate } from "@/app/useViewTransition";
import { PageHeader } from "@/components/PageHeader";
import { DetailSkeleton } from "@/components/Skeleton";
import type { RepoDetail } from "@/lib/types";
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
            <p>{t("offline.noDetail")}</p>
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
  const { t, locale } = useI18n();
  const fetchedAt = useStore((s) => s.detailFetchedAt);
  const warning = useStore((s) => s.detailWarning);
  const [period, setPeriod] = useState<7 | 30>(7);
  return (
    <div>
      {fetchedAt && (
        <p className="mb-3 text-xs text-mist">
          {t("offline.fetched", {
            date: new Intl.DateTimeFormat(locale, {
              dateStyle: "medium",
              timeStyle: "short",
            }).format(fetchedAt * 1000),
          })}
        </p>
      )}
      {warning && (
        <div role="status" className="mb-4 text-sm text-mist">
          <p>{t("offline.partial")}</p>
          <details>
            <summary>{t("Connection details")}</summary>
            <p className="mt-2 break-words">{warning}</p>
          </details>
        </div>
      )}
      <RepoIntro detail={detail} />
      <Kpis
        detail={detail}
        period={period}
        referenceTs={fetchedAt ?? undefined}
      />
      <HistoryCharts
        detail={detail}
        period={period}
        onPeriodChange={setPeriod}
        referenceTs={fetchedAt ?? undefined}
      />
      <TrafficSectionInner detail={detail} />
      <InsightsSection detail={detail} />
      <MetaFacts detail={detail} />
      <ReleasesTable detail={detail} />
    </div>
  );
}
