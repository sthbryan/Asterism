import { useI18n } from "@/app/hooks";
import { AreaChart } from "@/components/Charts";
import type { RepoDetail } from "@/lib/types";

export function HistoryCharts({ detail }: { detail: RepoDetail }) {
  const { t } = useI18n();
  const stars = detail.starHistory ?? [];
  const downloads = detail.downloadHistory ?? [];
  return (
    <div className="mt-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="card p-4">
          <div className="text-[13px] font-semibold">
            {t("Stars over time")}
          </div>
          <p className="mt-1 text-[11.5px] leading-snug text-faint">
            {t("Star growth for this repository.")}
          </p>
          <div className="mt-3">
            <AreaChart
              points={stars}
              tone="paper"
              empty={t("No stars yet, so there is nothing to plot.")}
            />
          </div>
        </div>
        <div className="card p-4">
          <div className="text-[13px] font-semibold">
            {t("Downloads over time")}
          </div>
          <p className="mt-1 text-[11.5px] leading-snug text-faint">
            {t("Download growth for this repository.")}
          </p>
          <div className="mt-3">
            <AreaChart
              points={downloads}
              tone="accent"
              empty={t(
                "No download snapshots yet. Refresh to take the first point.",
              )}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
