import type { ReactNode } from "react";
import { fmtCompact } from "../lib/format";

export function KpiCard({
  label,
  value,
  icon,
  sub,
  hero = false,
}: {
  label: string;
  value: number;
  icon?: ReactNode;
  sub?: string;
  hero?: boolean;
}) {
  return (
    <div className={`card min-w-0 p-5 ${hero ? "border-accent/25" : ""}`}>
      <div className="flex items-center gap-2 text-mist">
        {icon ? <span className="text-faint">{icon}</span> : null}
        <span className="kpi-label">{label}</span>
      </div>
      <div
        className={`mt-3 font-mono text-[32px] leading-none font-semibold tracking-[-0.02em] tabular ${
          hero ? "text-accent-soft" : ""
        }`}
      >
        {fmtCompact(value)}
      </div>
      {sub ? <div className="mt-2 text-[12px] leading-none text-faint">{sub}</div> : null}
    </div>
  );
}
