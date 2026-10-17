import { When } from "react-if";
import { useI18n } from "@/app/hooks";
import { HistoryChart } from "@/components/charts";
import { Section } from "@/components/Section";
import { fmtSigned } from "@/lib/format";
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
    <div className="app-section app-split mt-6 grid gap-6 lg:grid-cols-2">
      <Section className="app-section-flush">
        <div className="flex items-baseline justify-between gap-3">
          <div className="kpi-label text-faint">{t("Stars over time")}</div>
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
          <HistoryChart
            label={t("History chart")}
            points={starSeries}
            tone="muted"
            emptyText={t(
              "Open a repository or refresh to reconstruct star history from GitHub.",
            )}
          />
        </div>
      </Section>
      <Section className="app-section-flush">
        <div className="flex items-baseline justify-between gap-3">
          <div className="kpi-label text-faint">{t("Downloads over time")}</div>
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
          <HistoryChart
            label={t("History chart")}
            points={downloadSeries}
            tone="accent"
            emptyText={t("This chart fills in from the next refresh onward.")}
          />
        </div>
      </Section>
    </div>
  );
}
