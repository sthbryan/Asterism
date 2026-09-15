import {
  CodeIcon,
  DesktopIcon,
  DownloadSimpleIcon,
  FolderSimpleIcon,
  LockSimpleIcon,
  StarIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { When } from "react-if";
import { useI18n } from "@/app/hooks";
import { BarChart } from "@/components/Charts";
import { fmtNum } from "@/lib/format";
import { langColor } from "@/lib/langcolors";
import type { TrackedRepo } from "@/lib/types";

type ListSidebarProps = {
  highlight: { top: TrackedRepo | undefined; share: number };
  platformBars: { label: string; value: number; color?: string }[];
  languages: { items: [string, number][]; total: number };
  stats: { privateCount: number; silentCount: number; errorCount: number };
  onOpenRepo: (fullName: string) => void;
};

export function ListSidebar({
  highlight,
  platformBars,
  languages,
  stats,
  onOpenRepo,
}: ListSidebarProps) {
  const { t } = useI18n();
  const { top, share } = highlight;
  const { privateCount, silentCount, errorCount } = stats;
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <When condition={Boolean(top)}>
        <button
          type="button"
          onClick={() => top && onOpenRepo(top.fullName)}
          className="card w-full p-4 text-left transition-colors hover:bg-hover"
        >
          <div className="flex items-center gap-2 text-mist">
            <StarIcon size={14} className="text-faint" />
            <span className="kpi-label">{t("Top repository")}</span>
          </div>
          <p className="mt-2.5 truncate font-mono text-[15px] font-semibold tracking-[-0.01em]">
            {top?.fullName}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div>
              <div className="text-[11px] leading-none text-faint">
                {t("Stars")}
              </div>
              <div className="mt-1.5 font-mono text-[16px] leading-none font-semibold tabular">
                {fmtNum(top?.stars ?? 0)}
              </div>
            </div>
            <div>
              <div className="text-[11px] leading-none text-faint">
                {t("Downloads")}
              </div>
              <div className="mt-1.5 font-mono text-[16px] leading-none font-semibold text-accent-soft tabular">
                {fmtNum(top?.downloads ?? 0)}
              </div>
            </div>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-raised">
            <div
              className="h-full rounded-full bg-linear-to-r from-accent to-accent-hover"
              style={{ width: `${share}%` }}
            />
          </div>
          <p className="mt-2 text-[11.5px] leading-snug text-faint">
            {t("list.share", { value: fmtNum(share) })}
          </p>
        </button>
      </When>

      <When condition={platformBars.length > 0}>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-mist">
            <DesktopIcon size={14} className="text-faint" />
            <span className="kpi-label">{t("Downloads by platform")}</span>
          </div>
          <div className="mt-3">
            <BarChart
              items={platformBars.map((item) => ({
                ...item,
                label: item.label === "Other" ? t("Other") : item.label,
              }))}
            />
          </div>
        </div>
      </When>

      <When condition={languages.items.length > 0}>
        <div className="card p-4">
          <div className="flex items-center gap-2 text-mist">
            <CodeIcon size={14} className="text-faint" />
            <span className="kpi-label">{t("Languages")}</span>
          </div>
          <ul className="mt-3 space-y-2">
            {languages.items.map(([name, count]) => {
              const pct = (count / languages.total) * 100;
              const color = langColor(name === "Unknown" ? null : name);
              return (
                <li
                  key={name}
                  className="grid grid-cols-[1fr_28px] items-center gap-2"
                >
                  <span className="min-w-0">
                    <span className="flex min-w-0 items-center gap-1.5 text-[12.5px]">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: color }}
                      />
                      <span className="truncate">
                        {name === "Unknown" ? t("Unknown") : name}
                      </span>
                    </span>
                    <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-raised">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${Math.max(pct, 8)}%`,
                          background: color,
                        }}
                      />
                    </span>
                  </span>
                  <span className="text-right font-mono text-[11.5px] text-mist tabular">
                    {count}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </When>

      <div className="card p-4">
        <div className="flex items-center gap-2 text-mist">
          <FolderSimpleIcon size={14} className="text-faint" />
          <span className="kpi-label">{t("Tracked set")}</span>
        </div>
        <dl className="mt-3 space-y-2.5">
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-1.5 text-[12.5px] text-mist">
              <LockSimpleIcon size={12} className="text-faint" />
              {t("Private")}
            </dt>
            <dd className="font-mono text-[12.5px] tabular">
              {fmtNum(privateCount)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="flex items-center gap-1.5 text-[12.5px] text-mist">
              <DownloadSimpleIcon size={12} className="text-faint" />
              {t("No downloads")}
            </dt>
            <dd className="font-mono text-[12.5px] tabular">
              {fmtNum(silentCount)}
            </dd>
          </div>
          <When condition={errorCount > 0}>
            <div className="flex items-center justify-between gap-3">
              <dt className="flex items-center gap-1.5 text-[12.5px] text-accent-soft">
                <WarningCircleIcon size={12} />
                {t("Failed")}
              </dt>
              <dd className="font-mono text-[12.5px] text-accent-soft tabular">
                {fmtNum(errorCount)}
              </dd>
            </div>
          </When>
        </dl>
      </div>
    </div>
  );
}
