import { DownloadSimple, Eye, GitFork, Star } from "@phosphor-icons/react";
import { useI18n } from "../../app/hooks";
import { KpiCard } from "../../components/KpiCard";
import { pickKpiDelta, windowDelta } from "../../lib/series";
import type { RepoDetail } from "../../lib/types";

export function Kpis({ detail }: { detail: RepoDetail }) {
  const { t } = useI18n();
  const starKpi = pickKpiDelta(windowDelta(detail.starHistory ?? [], 7), null);
  const downloadKpi = pickKpiDelta(
    windowDelta(detail.downloadHistory ?? [], 7),
    null,
  );
  return (
    <div className="mt-5 grid grid-cols-4 gap-3">
      <KpiCard
        label={t("Stars")}
        value={detail.stars}
        icon={<Star size={15} />}
        sub={t("total")}
        delta={starKpi?.delta}
        deltaHint={starKpi?.hint}
      />
      <KpiCard
        label={t("Forks")}
        value={detail.forks}
        icon={<GitFork size={15} />}
        sub={t("total")}
      />
      <KpiCard
        label={t("Watchers")}
        value={detail.watchers}
        icon={<Eye size={15} />}
        sub={t("total")}
      />
      <KpiCard
        label={t("Downloads")}
        value={detail.downloads}
        icon={<DownloadSimple size={15} />}
        sub={t("release assets")}
        hero
        delta={downloadKpi?.delta}
        deltaHint={downloadKpi?.hint}
      />
    </div>
  );
}
