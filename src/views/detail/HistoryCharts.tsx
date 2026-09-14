import { AreaChart } from "../../components/Charts";
import { useI18n } from "../../lib/i18n";
import type { RepoDetail } from "../../lib/types";

export function HistoryCharts({ detail }: { detail: RepoDetail }) {
  const { t } = useI18n();
  return (
    <div className="mt-3 grid gap-3 lg:grid-cols-2">
      <div className="card p-4">
        <div className="text-[13px] font-semibold">{t("Stars over time")}</div>
        <p className="mt-1 text-[11.5px] leading-snug text-faint">
          {t(
            "Reconstructed from GitHub stargazers, then kept in sync on each refresh.",
          )}
        </p>
        <div className="mt-3">
          <AreaChart
            points={detail.starHistory ?? []}
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
          {t(
            "GitHub only reports current totals. Asterism snapshots them so the series grows from here.",
          )}
        </p>
        <div className="mt-3">
          <AreaChart
            points={detail.downloadHistory ?? []}
            tone="accent"
            empty={t(
              "No download snapshots yet. Refresh to take the first point.",
            )}
          />
        </div>
      </div>
    </div>
  );
}
