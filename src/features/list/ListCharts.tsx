import { useI18n } from "@/app/hooks";
import { AreaChart } from "@/components/Charts";
import { fmtSigned } from "@/lib/format";
import { delta, seriesWindow } from "@/lib/series";
import type { SeriesPoint } from "@/lib/types";

// Charts always show the trailing 30-day window.
const PERIOD_DAYS = 30;

export function ListCharts({
  starSeries,
  downloadSeries,
  referenceTs,
}: {
  starSeries: SeriesPoint[];
  downloadSeries: SeriesPoint[];
  referenceTs?: number;
}) {
  const { t } = useI18n();
  const starWindow = seriesWindow(starSeries, PERIOD_DAYS, referenceTs);
  const downloadWindow = seriesWindow(downloadSeries, PERIOD_DAYS, referenceTs);
  const stars = starWindow?.points ?? [];
  const downloads = downloadWindow?.points ?? [];
  return (
    <div className="mt-3">
      <div className="grid gap-3 lg:grid-cols-2">
        <div className="card p-4">
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-[13px] font-semibold">
              {t("Stars over time")}
            </div>
            {delta(stars) != null ? (
              <span className="font-mono text-[11.5px] text-faint tabular">
                {t("list.range", { value: fmtSigned(delta(stars) ?? 0) })}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[11.5px] leading-snug text-faint">
            {t(
              "Reconstructed from GitHub stargazers, then updated on each refresh.",
            )}
          </p>
          {starWindow?.partial ? (
            <p className="mt-1 text-[10.5px] text-faint">
              {t("list.partialCoverage", {
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
              empty={t(
                "Open a repository or refresh to reconstruct star history from GitHub.",
              )}
            />
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-[13px] font-semibold">
              {t("Downloads over time")}
            </div>
            {delta(downloads) != null ? (
              <span className="font-mono text-[11.5px] text-faint tabular">
                {t("list.range", { value: fmtSigned(delta(downloads) ?? 0) })}
              </span>
            ) : null}
          </div>
          <p className="mt-1 text-[11.5px] leading-snug text-faint">
            {t(
              "GitHub does not publish download history. Asterism records a snapshot each refresh.",
            )}
          </p>
          {downloadWindow?.partial ? (
            <p className="mt-1 text-[10.5px] text-faint">
              {t("list.partialCoverage", {
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
              empty={t("This chart fills in from the next refresh onward.")}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
