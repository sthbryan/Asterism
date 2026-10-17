import { useI18n } from "@/app/hooks";
import { HistoryChart } from "@/components/charts";
import { Section } from "@/components/Section";
import type { RepoDetail } from "@/lib/types";
export function HistoryCharts({ detail }: { detail: RepoDetail }) {
  const { t } = useI18n();
  const stars = detail.starHistory ?? [];
  const downloads = detail.downloadHistory ?? [];
  return (
    <div className="app-section app-split mt-6 grid gap-6 lg:grid-cols-2">
      <Section className="app-section-flush">
        <div className="kpi-label text-faint">{t("Stars over time")}</div>
        <p className="mt-1 text-[11.5px] leading-snug text-faint">
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
      <Section className="app-section-flush">
        <div className="kpi-label text-faint">{t("Downloads over time")}</div>
        <p className="mt-1 text-[11.5px] leading-snug text-faint">
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
