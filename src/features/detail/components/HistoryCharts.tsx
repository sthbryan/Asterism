import { When } from "react-if";
import { useI18n } from "@/app/hooks";
import { AreaChart } from "@/components/Charts";
import { seriesWindow } from "@/lib/series";
import type { RepoDetail } from "@/lib/types";

// Charts always show the trailing 30-day window.
const PERIOD_DAYS = 30;

export function HistoryCharts({
  detail,
  referenceTs,
}: {
  detail: RepoDetail;
  referenceTs?: number;
}) {
  const { t } = useI18n();
  const starWindow = seriesWindow(
    detail.starHistory ?? [],
    PERIOD_DAYS,
    referenceTs,
  );
  const downloadWindow = seriesWindow(
    detail.downloadHistory ?? [],
    PERIOD_DAYS,
    referenceTs,
  );
  const stars = starWindow?.points ?? [];
  const downloads = downloadWindow?.points ?? [];
  return (
    <div className="mt-3">
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
          <When condition={starWindow?.partial}>
            <p className="mt-1 text-[10.5px] text-faint">
              {t("detail.partialCoverage", {
                days:
                  starWindow?.observedFromTs && starWindow?.observedToTs
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
          </When>
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
          <When condition={downloadWindow?.partial}>
            <p className="mt-1 text-[10.5px] text-faint">
              {t("detail.partialCoverage", {
                days:
                  downloadWindow?.observedFromTs && downloadWindow?.observedToTs
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
          </When>
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
