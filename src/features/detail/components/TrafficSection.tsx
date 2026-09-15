import { DownloadSimpleIcon, EyeIcon } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { Case, Default, Else, If, Switch, Then, When } from "react-if";
import { useI18n } from "@/app/hooks";
import { useStore } from "@/app/store";
import { ColumnChart } from "@/components/Charts";
import { fmtCompact } from "@/lib/format";
import type { RepoDetail } from "@/lib/types";

export function TrafficSection({ detail }: { detail: RepoDetail }) {
  const { t, locale } = useI18n();
  const fetchedAt = useStore((s) => s.detailFetchedAt);
  const samples = [detail.views, detail.clones].filter(Boolean);
  const days = samples.flatMap(
    (traffic) => traffic?.days?.map((d) => d.ts) ?? [],
  );
  const fmt = (ts: number) =>
    new Intl.DateTimeFormat(locale, {
      dateStyle: "medium",
      timeZone: "UTC",
    }).format(ts * 1000);
  return (
    <div className="card mt-3 p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-[13px] font-semibold">
          {t("Traffic · 14 days")}
        </div>
        <span className="text-[11px] text-faint">
          {days.length > 0
            ? t("offline.period", {
                from: fmt(Math.min(...days)),
                to: fmt(Math.max(...days)),
              })
            : fetchedAt
              ? t("offline.fetched", { date: fmt(fetchedAt) })
              : t("Unavailable")}
        </span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-mist">
        {t("offline.traffic")}
      </p>
      <If
        condition={Boolean(
          detail.trafficError && !detail.views && !detail.clones,
        )}
      >
        <Then>
          <p className="mt-3 text-[13px] leading-relaxed text-mist">
            {t("Views and clones require push access.")} {detail.trafficError}
          </p>
        </Then>
        <Else>
          <div className="mt-3 grid grid-cols-2 gap-5">
            <div>
              <TrafficBlock
                label={t("Views")}
                icon={<EyeIcon size={14} />}
                traffic={detail.views}
                status={detail.viewsStatus}
                fetchedAt={detail.views?.fetchedAt}
              />
              <div className="mt-3">
                <ColumnChart
                  tone="paper"
                  items={(detail.views?.days ?? []).map((day) => ({
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
                icon={<DownloadSimpleIcon size={14} />}
                traffic={detail.clones}
                status={detail.clonesStatus}
                fetchedAt={detail.clones?.fetchedAt}
              />
              <div className="mt-3">
                <ColumnChart
                  tone="accent"
                  items={(detail.clones?.days ?? []).map((day) => ({
                    ts: day.ts,
                    value: day.count,
                    hint: t("common.unique", { count: day.uniques }),
                  }))}
                  empty={t("No clone samples.")}
                />
              </div>
            </div>
          </div>
        </Else>
      </If>
    </div>
  );
}

function TrafficBlock({
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
                {t("offline.fetched", {
                  date: new Intl.DateTimeFormat(locale, {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format((fetchedAt ?? 0) * 1000),
                })}
              </div>
            </When>
            <When condition={Boolean(sampleFrom && sampleTo)}>
              <div className="mt-1 text-[10px] text-faint">
                {t("offline.period", {
                  from: fmt(sampleFrom ?? 0),
                  to: fmt(sampleTo ?? 0),
                })}
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
