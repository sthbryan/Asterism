import { useI18n } from "@/app/hooks";
import { AreaChart } from "@/components/Charts";
import { fmtSigned } from "@/lib/format";
import type { SeriesPoint } from "@/lib/types";

export function ListCharts({
  starSeries,
  downloadSeries,
  starDelta,
  downloadDelta,
}: {
  starSeries: SeriesPoint[];
  downloadSeries: SeriesPoint[];
  starDelta: number | null;
  downloadDelta: number | null;
}) {
  const { t } = useI18n();
  return (
    <div className="mt-3 grid gap-3 lg:grid-cols-2">
      <div className="card p-4">
        <div className="flex items-baseline justify-between gap-3">
          <div className="text-[13px] font-semibold">
            {t("Stars over time")}
          </div>
          {starDelta != null ? (
            <span className="font-mono text-[11.5px] text-faint tabular">
              {t("list.range", { value: fmtSigned(starDelta) })}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-[11.5px] leading-snug text-faint">
          {t(
            "Reconstructed from GitHub stargazers, then updated on each refresh.",
          )}
        </p>
        <div className="mt-3">
          <AreaChart
            points={starSeries}
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
          {downloadDelta != null ? (
            <span className="font-mono text-[11.5px] text-faint tabular">
              {t("list.range", { value: fmtSigned(downloadDelta) })}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-[11.5px] leading-snug text-faint">
          {t(
            "GitHub does not publish download history. Asterism records a snapshot each refresh.",
          )}
        </p>
        <div className="mt-3">
          <AreaChart
            points={downloadSeries}
            tone="accent"
            empty={t("This chart fills in from the next refresh onward.")}
          />
        </div>
      </div>
    </div>
  );
}
