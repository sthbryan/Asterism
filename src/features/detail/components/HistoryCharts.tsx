import { ChartLineUpIcon, DownloadSimpleIcon } from "@phosphor-icons/react";
import { useI18n } from "@/app/hooks";
import { HistoryChart } from "@/components/charts";
import { Section } from "@/components/Section";
import type { RepoDetail } from "@/lib/types";
export function HistoryCharts({ detail }: { detail: RepoDetail }) {
  const { t } = useI18n();
  const stars = detail.starHistory ?? [];
  const downloads = detail.downloadHistory ?? [];
  return (
    <div className="grid gap-band lg:grid-cols-2">
      <Section
        label={t("Stars over time")}
        icon={<ChartLineUpIcon size={15} />}
      >
        <p className="text-[11.5px] leading-snug text-faint">
          {t("Star growth for this repository.")}
        </p>
        <div className="mt-3">
          <HistoryChart
            label={t("History chart")}
            points={stars}
            tone="muted"
            emptyText={t("No stars yet, so there is nothing to plot.")}
          />
        </div>
      </Section>
      <Section
        label={t("Downloads over time")}
        icon={<DownloadSimpleIcon size={15} />}
        tone="accent"
      >
        <p className="text-[11.5px] leading-snug text-faint">
          {t("Download growth for this repository.")}
        </p>
        <div className="mt-3">
          <HistoryChart
            label={t("History chart")}
            points={downloads}
            tone="accent"
            emptyText={t(
              "No download snapshots yet. Refresh to take the first point.",
            )}
          />
        </div>
      </Section>
    </div>
  );
}
