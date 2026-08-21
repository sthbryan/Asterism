import type { ReactNode } from "react";
import { fmtCompact } from "../lib/format";

const tones = {
  accent: "bg-accent/15 text-accent-soft",
  cyan: "bg-cyan/15 text-cyan",
  amber: "bg-amber/15 text-amber",
  rose: "bg-rose/15 text-rose",
};

export function KpiCard({
  label,
  value,
  icon,
  hint,
  tone = "accent",
}: {
  label: string;
  value: number;
  icon: ReactNode;
  hint?: string;
  tone?: keyof typeof tones;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center gap-2.5 text-[13px] text-mist">
        <span className={`grid h-8 w-8 place-items-center rounded-xl ${tones[tone]}`}>
          {icon}
        </span>
        {label}
      </div>
      <div className="mt-4 text-[28px] leading-none font-semibold tracking-[-0.04em] tabular">
        {fmtCompact(value)}
      </div>
      {hint ? <div className="mt-2 text-[12px] text-mist">{hint}</div> : null}
    </div>
  );
}
