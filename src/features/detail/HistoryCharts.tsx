import { useI18n } from "@/app/hooks";
import { AreaChart } from "@/components/Charts";
import { Select } from "@/components/Select";
import { seriesWindow } from "@/lib/series";
import type { RepoDetail } from "@/lib/types";

export function HistoryCharts({
  detail,
  period,
  onPeriodChange,
  referenceTs,
}: {
  detail: RepoDetail;
  period: 7 | 30;
  onPeriodChange: (value: 7 | 30) => void;
  referenceTs?: number;
}) {
  const { t } = useI18n();
  const starWindow = seriesWindow(
    detail.starHistory ?? [],
    period,
    referenceTs,
  );
  const downloadWindow = seriesWindow(
    detail.downloadHistory ?? [],
    period,
    referenceTs,
  );
  const stars = starWindow?.points ?? [];
  const downloads = downloadWindow?.points ?? [];
  return (
    <div className="mt-3">
      <div className="mb-3 flex justify-end">
        <Select
          value={String(period)}
          onChange={(v) => onPeriodChange(Number(v) as 7 | 30)}
          options={[
            { value: "7", label: t("7 days") },
            { value: "30", label: t("30 days") },
          ]}
          className="w-32"
          ariaLabel={t("Period")}
        />
      </div>
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="card p-4">
          <div className="text-[13px] font-semibold">
            {t("Stars over time")}
          </div>
          <p className="mt-1 text-[11.5px] leading-snug text-faint">
            {t(
              "Reconstructed from GitHub stargazers, then kept in sync on each refresh.",
            )}
          </p>
          {starWindow?.partial ? (
            <p className="mt-1 text-[10.5px] text-faint">
              {t("detail.partialCoverage", {
                days:
                  starWindow.observedFromTs && starWindow.observedToTs
                    ? Math.max(
                        1,
                        Math.round(
                          (starWindow.observedToTs -
                            starWindow.observedFromTs) /
                            86400,
                        ),
                      )
                    : 0,
              })}
            </p>
          ) : null}
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
            {t(
              "GitHub only reports current totals. Asterism snapshots them so the series grows from here.",
            )}
          </p>
          {downloadWindow?.partial ? (
            <p className="mt-1 text-[10.5px] text-faint">
              {t("detail.partialCoverage", {
                days:
                  downloadWindow.observedFromTs && downloadWindow.observedToTs
                    ? Math.max(
                        1,
                        Math.round(
                          (downloadWindow.observedToTs -
                            downloadWindow.observedFromTs) /
                            86400,
                        ),
                      )
                    : 0,
              })}
            </p>
          ) : null}
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
