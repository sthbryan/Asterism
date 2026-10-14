import { Surface, TimeSeriesChart } from "@zovaris/sephiro";
import { useI18n } from "@/app/hooks";
import { fmtAxisDateLong, fmtCompact } from "@/lib/format";
import type { RepoDetail } from "@/lib/types";

export function HistoryCharts({ detail }: { detail: RepoDetail }) {
  const { t } = useI18n();
  const stars = detail.starHistory ?? [];
  const downloads = detail.downloadHistory ?? [];
  return (
    <div className="mt-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <Surface padding="md" className="border border-hairline">
          <div className="text-[13px] font-semibold">
            {t("Stars over time")}
          </div>
          <p className="mt-1 text-[11.5px] leading-snug text-faint">
            {t("Star growth for this repository.")}
          </p>
          <div className="mt-3">
            <TimeSeriesChart
              label={t("History chart")}
              formatValue={fmtCompact}
              formatDate={fmtAxisDateLong}
              keyboardHelpText={t("common.chartKeyboardHelp")}
              points={stars}
              tone="paper"
              emptyText={t("No stars yet, so there is nothing to plot.")}
            />
          </div>
        </Surface>
        <Surface padding="md" className="border border-hairline">
          <div className="text-[13px] font-semibold">
            {t("Downloads over time")}
          </div>
          <p className="mt-1 text-[11.5px] leading-snug text-faint">
            {t("Download growth for this repository.")}
          </p>
          <div className="mt-3">
            <TimeSeriesChart
              label={t("History chart")}
              formatValue={fmtCompact}
              formatDate={fmtAxisDateLong}
              keyboardHelpText={t("common.chartKeyboardHelp")}
              points={downloads}
              tone="accent"
              emptyText={t(
                "No download snapshots yet. Refresh to take the first point.",
              )}
            />
          </div>
        </Surface>
      </div>
    </div>
  );
}
