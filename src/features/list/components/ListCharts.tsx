import { Surface, TimeSeriesChart } from "@zovaris/sephiro";
import { When } from "react-if";
import { useI18n } from "@/app/hooks";
import { fmtAxisDateLong, fmtCompact, fmtSigned } from "@/lib/format";
import { delta } from "@/lib/series";
import type { SeriesPoint } from "@/lib/types";

export function ListCharts({
  starSeries,
  downloadSeries,
}: {
  starSeries: SeriesPoint[];
  downloadSeries: SeriesPoint[];
}) {
  const { t } = useI18n();
  const starDelta = delta(starSeries);
  const downloadDelta = delta(downloadSeries);
  return (
    <div className="mt-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <Surface padding="md" className="border border-hairline">
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-[13px] font-semibold">
              {t("Stars over time")}
            </div>
            <When condition={starDelta != null}>
              <span className="font-mono text-[11.5px] text-faint tabular">
                {t("list.range", { value: fmtSigned(starDelta ?? 0) })}
              </span>
            </When>
          </div>
          <p className="mt-1 text-[11.5px] leading-snug text-faint">
            {t("Star growth across tracked repositories.")}
          </p>
          <div className="mt-3">
            <TimeSeriesChart
              label={t("History chart")}
              formatValue={fmtCompact}
              formatDate={fmtAxisDateLong}
              keyboardHelpText={t("common.chartKeyboardHelp")}
              points={starSeries}
              tone="paper"
              emptyText={t(
                "Open a repository or refresh to reconstruct star history from GitHub.",
              )}
            />
          </div>
        </Surface>
        <Surface padding="md" className="border border-hairline">
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-[13px] font-semibold">
              {t("Downloads over time")}
            </div>
            <When condition={downloadDelta != null}>
              <span className="font-mono text-[11.5px] text-faint tabular">
                {t("list.range", { value: fmtSigned(downloadDelta ?? 0) })}
              </span>
            </When>
          </div>
          <p className="mt-1 text-[11.5px] leading-snug text-faint">
            {t("Download growth across tracked repositories.")}
          </p>
          <div className="mt-3">
            <TimeSeriesChart
              label={t("History chart")}
              formatValue={fmtCompact}
              formatDate={fmtAxisDateLong}
              keyboardHelpText={t("common.chartKeyboardHelp")}
              points={downloadSeries}
              tone="accent"
              emptyText={t("This chart fills in from the next refresh onward.")}
            />
          </div>
        </Surface>
      </div>
    </div>
  );
}
