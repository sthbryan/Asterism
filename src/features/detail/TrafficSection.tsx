import { DownloadSimple, Eye } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useI18n } from "@/app/hooks";
import { ColumnChart } from "@/components/Charts";
import { fmtCompact } from "@/lib/format";
import { fillTrafficDays } from "@/lib/series";
import type { RepoDetail } from "@/lib/types";

export function TrafficSection({ detail }: { detail: RepoDetail }) {
  const { t } = useI18n();
  return (
    <div className="card mt-3 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-[13px] font-semibold">
          {t("Traffic · 14 days")}
        </div>
        <span className="text-[11px] text-faint">
          {t("GitHub only exposes the last 14 days")}
        </span>
      </div>
      {detail.trafficError && !detail.views && !detail.clones ? (
        <p className="mt-3 text-[13px] leading-relaxed text-mist">
          {t("Views and clones require push access.")} {detail.trafficError}
        </p>
      ) : (
        <div className="mt-3 grid grid-cols-2 gap-5">
          <div>
            <TrafficBlock
              label={t("Views")}
              icon={<Eye size={14} />}
              traffic={detail.views}
            />
            <div className="mt-3">
              <ColumnChart
                tone="paper"
                items={fillTrafficDays(detail.views?.days).map((day) => ({
                  ts: day.ts,
                  value: day.count,
                  hint: t("common.unique", { count: day.uniques }),
                }))}
                empty={t("No view samples.")}
              />
            </div>
          </div>
          <div>
            <TrafficBlock
              label={t("Clones")}
              icon={<DownloadSimple size={14} />}
              traffic={detail.clones}
            />
            <div className="mt-3">
              <ColumnChart
                tone="accent"
                items={fillTrafficDays(detail.clones?.days).map((day) => ({
                  ts: day.ts,
                  value: day.count,
                  hint: t("common.unique", { count: day.uniques }),
                }))}
                empty={t("No clone samples.")}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TrafficBlock({
  label,
  icon,
  traffic,
}: {
  label: string;
  icon: ReactNode;
  traffic: RepoDetail["views"];
}) {
  const { t } = useI18n();
  return (
    <div>
      <div className="flex items-center gap-2 text-mist">
        <span className="text-faint">{icon}</span>
        <span className="kpi-label">{label}</span>
      </div>
      {traffic ? (
        <div className="mt-2.5">
          <div className="font-mono text-[18px] leading-none font-semibold tabular">
            {fmtCompact(traffic.count)}
          </div>
          <div className="mt-1.5 text-[12px] leading-none text-faint">
            {t("common.unique", { count: traffic.uniques })}
          </div>
        </div>
      ) : (
        <p className="mt-2.5 text-[13px] text-faint">{t("Unavailable")}</p>
      )}
    </div>
  );
}
