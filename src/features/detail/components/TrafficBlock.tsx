import type { ReactNode } from "react";
import { Case, Default, Switch, When } from "react-if";
import { useI18n } from "@/app/hooks";
import { fmtCompact } from "@/lib/format";
import type { RepoDetail } from "@/lib/types";

export function TrafficBlock({
  label,
  icon,
  traffic,
  status,
  fetchedAt,
}: {
  label: string;
  icon: ReactNode;
  traffic: RepoDetail["views"];
  status?: RepoDetail["viewsStatus"];
  fetchedAt?: number | null;
}) {
  const { t, locale } = useI18n();
  const fmt = (ts: number) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(ts * 1000);
  const sampleFrom = traffic?.sampleFrom;
  const sampleTo = traffic?.sampleTo;
  return (
    <div>
      <div className="flex items-center gap-2 text-mist">
        <span className="text-faint">{icon}</span>
        <span className="kpi-label">{label}</span>
      </div>
      <Switch>
        <Case condition={status === "forbidden" && !traffic}>
          <p className="mt-2.5 text-[13px] text-faint">
            {t("Traffic requires push access.")}
          </p>
        </Case>
        <Case condition={status === "error" && !traffic}>
          <p className="mt-2.5 text-[13px] text-faint">
            {t("Traffic could not be loaded.")}
          </p>
        </Case>
        <Case condition={Boolean(traffic)}>
          <div className="mt-2.5">
            <div className="font-mono text-[18px] leading-none font-semibold tabular">
              {traffic && fmtCompact(traffic.count)}
            </div>
            <div className="mt-1.5 text-[12px] leading-none text-faint">
              {traffic && t("common.unique", { count: traffic.uniques })}
            </div>
            <When condition={Boolean(fetchedAt)}>
              <div className="mt-1 text-[10px] text-faint">
                {t("list.updated", {
                  value: new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format((fetchedAt ?? 0) * 1000),
                })}
              </div>
            </When>
            <When condition={Boolean(sampleFrom && sampleTo)}>
              <div className="mt-1 text-[10px] text-faint">
                {fmt(sampleFrom ?? 0)} – {fmt(sampleTo ?? 0)}
              </div>
            </When>
            <When condition={status === "forbidden"}>
              <div className="mt-1 text-[10px] text-faint">
                {t("Traffic requires push access.")}
              </div>
            </When>
            <When condition={status === "error"}>
              <div className="mt-1 text-[10px] text-faint">
                {t("Traffic could not be loaded.")}
              </div>
            </When>
          </div>
        </Case>
        <Case condition={status === "ok"}>
          <p className="mt-2.5 text-[13px] text-faint">
            {t("No activity in this period.")}
          </p>
        </Case>
        <Default>
          <p className="mt-2.5 text-[13px] text-faint">{t("Unavailable")}</p>
        </Default>
      </Switch>
    </div>
  );
}
