import { AnimatedNumber, Surface } from "@zovaris/sephiro";
import type { ReactNode } from "react";
import { useI18n } from "@/app/hooks";
import { fmtCompact, fmtSigned } from "@/lib/format";

export function KpiCard({
  label,
  value,
  icon,
  sub,
  delta,
  deltaHint,
  hero = false,
}: {
  label: string;
  value: number | null;
  icon?: ReactNode;
  sub?: string;
  delta?: number | null;
  deltaHint?: string;
  hero?: boolean;
}) {
  const { t } = useI18n();
  return (
    <Surface
      padding="md"
      className={`min-w-0 border border-hairline ${hero ? "border-accent/25" : ""}`}
    >
      <div className="flex items-center gap-2 text-mist">
        {icon ? <span className="text-faint">{icon}</span> : null}
        <span className="kpi-label">{label}</span>
      </div>
      <div
        className={`mt-2.5 font-mono text-[24px] leading-none font-semibold tracking-[-0.02em] tabular ${
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
    </Surface>
  );
}
