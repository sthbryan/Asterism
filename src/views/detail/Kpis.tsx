import { DownloadSimple, Eye, GitFork, Star } from "@phosphor-icons/react";
import { KpiCard } from "../../components/KpiCard";
import { pickKpiDelta, windowDelta } from "../../lib/series";
import type { RepoDetail } from "../../lib/types";

export function Kpis({ detail }: { detail: RepoDetail }) {
  const starKpi = pickKpiDelta(windowDelta(detail.starHistory ?? [], 7), null);
  const downloadKpi = pickKpiDelta(windowDelta(detail.downloadHistory ?? [], 7), null);
  return (
    <div className="mt-5 grid grid-cols-4 gap-3">
      <KpiCard
        label="Stars"
        value={detail.stars}
        icon={<Star size={15} />}
        sub="total"
        delta={starKpi?.delta}
        deltaHint={starKpi?.hint}
      />
      <KpiCard label="Forks" value={detail.forks} icon={<GitFork size={15} />} sub="total" />
      <KpiCard label="Watchers" value={detail.watchers} icon={<Eye size={15} />} sub="total" />
      <KpiCard
        label="Downloads"
        value={detail.downloads}
        icon={<DownloadSimple size={15} />}
        sub="release assets"
        hero
        delta={downloadKpi?.delta}
        deltaHint={downloadKpi?.hint}
      />
    </div>
  );
}
