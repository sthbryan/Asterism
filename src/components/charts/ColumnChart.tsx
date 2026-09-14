import { useState } from "react";
import { fmtAxisDate, fmtNum } from "../../lib/format";
import { STROKE, type ChartTone } from "./plot";

export function ColumnChart({
  items,
  tone = "paper",
  empty,
}: {
  items: { ts: number; value: number; hint?: string }[];
  tone?: ChartTone;
  empty?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...items.map((item) => item.value), 1);
  const current = active != null ? items[active] : null;

  if (items.length === 0) {
    return (
      <div className="grid h-[108px] place-items-center text-[12.5px] text-faint">
        {empty ?? "No daily data."}
      </div>
    );
  }

  return (
    <div>
      <div
        className="flex h-[72px] items-end gap-[3px]"
        onPointerLeave={() => setActive(null)}
      >
        {items.map((item, index) => {
          const h = item.value > 0 ? Math.max((item.value / max) * 100, 6) : 2;
          const on = active === index;
          return (
            <button
              key={item.ts}
              type="button"
              aria-label={`${fmtAxisDate(item.ts)}: ${fmtNum(item.value)}`}
              onPointerEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              className="relative h-full min-w-0 flex-1 rounded-sm"
            >
              <span
                className="absolute right-0 bottom-0 left-0 rounded-sm transition-colors"
                style={{
                  height: `${h}%`,
                  background: on ? STROKE[tone] : "var(--color-overlay)",
                }}
              />
            </button>
          );
        })}
      </div>
      <div className="mt-1.5 min-h-[14px] font-mono text-[10px] text-faint tabular">
        {current
          ? `${fmtAxisDate(current.ts)} · ${fmtNum(current.value)}${current.hint ? ` · ${current.hint}` : ""}`
          : `${fmtAxisDate(items[0].ts)} – ${fmtAxisDate(items[items.length - 1].ts)}`}
      </div>
    </div>
  );
}
