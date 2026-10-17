import { AnimatedNumber } from "@zovaris/sephiro";
import { cn } from "cn";
import type { ReactNode } from "react";
import { useI18n } from "@/app/hooks";
import { fmtCompact, fmtSigned } from "@/lib/format";

/** One reading on the KPI strip: label, number, delta. No card, no border. */
export function KpiCard({
  label,
  value,
  icon,
  sub,
  delta,
  deltaHint,
  hero = false,
  className,
}: {
  label: string;
  value: number | null;
  icon?: ReactNode;
  sub?: string;
  delta?: number | null;
  deltaHint?: string;
  hero?: boolean;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <div className={cn("min-w-0", hero && "is-hero", className)}>
      <div className="flex items-center gap-2.5">
        {icon ? (
          <span className={cn("app-chip", hero && "app-chip--accent")}>
            {icon}
          </span>
        ) : null}
        <span className="kpi-label">{label}</span>
      </div>
      <div
        className={`mt-2 font-mono text-[26px] leading-none font-semibold tracking-[-0.02em] tabular ${
          hero ? "text-accent-soft" : value === 0 ? "text-faint" : ""
        }`}
      >
        {value == null ? (
          fmtCompact(value)
        ) : (
          <AnimatedNumber value={value} format={fmtCompact} />
        )}
      </div>
      {delta != null ? (
        <div
          className={`mt-1.5 font-mono text-[11.5px] leading-none tabular ${
            delta > 0
              ? "text-ok"
              : delta < 0
                ? "text-accent-soft"
                : "text-faint"
          }`}
        >
          {fmtSigned(delta)}
          {deltaHint
            ? ` · ${deltaHint === "sync" ? t("sync") : deltaHint}`
            : ""}
        </div>
      ) : sub ? (
        <div className="mt-1.5 text-[11.5px] leading-none text-faint">
          {sub}
        </div>
      ) : null}
    </div>
  );
}
