import type { ReactNode } from "react";
import { useI18n } from "@/app/hooks";
import { fmtCompact, fmtSigned } from "@/lib/format";
import { PopNumber } from "./PopNumber";

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
  value: number;
  icon?: ReactNode;
  sub?: string;
  delta?: number | null;
  deltaHint?: string;
  hero?: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className={`card min-w-0 p-4 ${hero ? "border-accent/25" : ""}`}>
      <div className="flex items-center gap-2 text-mist">
        {icon ? <span className="text-faint">{icon}</span> : null}
        <span className="kpi-label">{label}</span>
      </div>
      <div
        className={`mt-2.5 font-mono text-[24px] leading-none font-semibold tracking-[-0.02em] tabular ${
          hero ? "text-accent-soft" : value === 0 ? "text-faint" : ""
        }`}
      >
        <PopNumber value={fmtCompact(value)} />
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
