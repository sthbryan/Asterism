import { DownloadSimpleIcon, EyeIcon } from "@phosphor-icons/react";
import { Surface } from "@zovaris/sephiro";
import { Else, If, Then } from "react-if";
import { useI18n } from "@/app/hooks";
import { useStore } from "@/app/store";
import { TrafficChart } from "@/components/charts";
import type { RepoDetail } from "@/lib/types";

import { TrafficBlock } from "./TrafficBlock";

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
    <Surface padding="md" className="mt-3 border border-hairline">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-[13px] font-semibold">
          {t("Traffic · 14 days")}
        </div>
        <span className="text-[11px] text-faint">
          {days.length > 0
            ? `${fmt(Math.min(...days))} – ${fmt(Math.max(...days))}`
            : fetchedAt
              ? t("list.updated", { value: fmt(fetchedAt) })
              : t("Unavailable")}
        </span>
      </div>
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
                <TrafficChart
                  label={t("Views")}
                  tone="muted"
                  points={(detail.views?.days ?? []).map((day) => ({
                    ts: day.ts,
                    value: day.count,
                  }))}
                  emptyText={t("No view samples.")}
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
                <TrafficChart
                  label={t("Clones")}
                  tone="accent"
                  points={(detail.clones?.days ?? []).map((day) => ({
                    ts: day.ts,
                    value: day.count,
                  }))}
                  emptyText={t("No clone samples.")}
                />
              </div>
            </div>
          </div>
        </Else>
      </If>
    </Surface>
  );
}
