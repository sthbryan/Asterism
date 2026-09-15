import {
  DownloadSimpleIcon,
  EyeIcon,
  GitForkIcon,
  StarIcon,
} from "@phosphor-icons/react";
import { useI18n } from "@/app/hooks";
import { KpiCard } from "@/components/KpiCard";
import { pickKpiDelta, windowDelta } from "@/lib/series";
import type { RepoDetail } from "@/lib/types";

const PERIOD_DAYS = 30;

export function Kpis({
  detail,
  referenceTs,
}: {
  detail: RepoDetail;
  referenceTs?: number;
}) {
  const { t } = useI18n();
  const starKpi = pickKpiDelta(
    windowDelta(detail.starHistory ?? [], PERIOD_DAYS, referenceTs),
    null,
    PERIOD_DAYS,
  );
  const downloadKpi = pickKpiDelta(
    windowDelta(detail.downloadHistory ?? [], PERIOD_DAYS, referenceTs),
    null,
    PERIOD_DAYS,
  );
  return (
    <div className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <KpiCard
        label={t("Stars")}
        value={detail.stars}
        icon={<StarIcon size={15} />}
        sub={t("common.total")}
        delta={starKpi?.delta}
        deltaHint={starKpi?.hint}
      />
      <KpiCard
        label={t("Forks")}
        value={detail.forks}
        icon={<GitForkIcon size={15} />}
        sub={t("common.total")}
      />
      <KpiCard
        label={t("Watchers")}
        value={detail.watchers}
        icon={<EyeIcon size={15} />}
        sub={t("common.total")}
      />
      <KpiCard
        label={t("Downloads")}
        value={detail.downloads}
        icon={<DownloadSimpleIcon size={15} />}
        sub={t("release assets")}
        hero
        delta={downloadKpi?.delta}
        deltaHint={downloadKpi?.hint}
      />
    </div>
  );
}
