import { ChartLineUpIcon, DownloadSimpleIcon } from "@phosphor-icons/react";
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
    <div className="flex flex-col gap-band">
      <Section
        label={t("Stars over time")}
        icon={<ChartLineUpIcon size={15} />}
        meta={
          starDelta != null
            ? t("list.range", { value: fmtSigned(starDelta ?? 0) })
            : null
        }
      >
        <HistoryChart
          label={t("History chart")}
          points={starSeries}
          tone="muted"
          emptyText={t(
            "Open a repository or refresh to reconstruct star history from GitHub.",
          )}
        />
      </Section>
      <Section
        label={t("Downloads over time")}
        icon={<DownloadSimpleIcon size={15} />}
        tone="accent"
        meta={
          downloadDelta != null
            ? t("list.range", { value: fmtSigned(downloadDelta ?? 0) })
            : null
        }
      >
        <HistoryChart
          label={t("History chart")}
          points={downloadSeries}
          tone="accent"
          emptyText={t("This chart fills in from the next refresh onward.")}
        />
      </Section>
    </div>
  );
}
