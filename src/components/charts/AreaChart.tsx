import { useMemo, useState } from "react";
import { useI18n } from "@/app/hooks";
import { fmtAxisDate, fmtAxisDateLong, fmtCompact } from "@/lib/format";
import type { SeriesPoint } from "@/lib/types";
import { buildPlot, type ChartTone, FILL, STROKE } from "./plot";

export function AreaChart({
  points,
  tone = "paper",
  empty,
}: {
  points: SeriesPoint[];
  tone?: ChartTone;
  empty?: string;
}) {
  const { t } = useI18n();
  const [active, setActive] = useState<number | null>(null);
  const plot = useMemo(() => buildPlot(points), [points]);

  if (!plot) {
    return (
      <div className="grid h-[132px] place-items-center px-2 text-center text-[12.5px] leading-relaxed text-faint">
        {empty ?? t("Not enough samples yet.")}
      </div>
    );
  }

  const { path, area, coords, max, first, last } = plot;
  const hover = active != null ? points[active] : last;
  const hoverCoord =
    active != null ? coords[active] : coords[coords.length - 1];

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[18px] leading-none font-semibold tabular">
          {fmtCompact(hover.value)}
        </span>
        <span className="font-mono text-[11px] text-faint tabular">
          {fmtAxisDateLong(hover.ts)}
        </span>
      </div>
      <div className="mt-3 grid grid-cols-[48px_minmax(0,1fr)] gap-2">
        <div className="flex h-[96px] flex-col justify-between py-0.5 text-right font-mono text-[10px] text-faint tabular">
          <span className="truncate">{fmtCompact(max)}</span>
          <span>0</span>
        </div>
        <div
          className="relative h-[96px]"
          onPointerLeave={() => setActive(null)}
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            const x = ((event.clientX - rect.left) / rect.width) * 100;
            let nearest = 0;
            let best = Infinity;
            coords.forEach((coord, index) => {
              const dist = Math.abs(coord.x - x);
              if (dist < best) {
                best = dist;
                nearest = index;
              }
            });
            setActive(nearest);
          }}
        >
          <svg
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full overflow-visible"
            role="img"
            aria-label={t("History chart")}
          >
            <line
              x1="0"
              x2="100"
              y1="100"
              y2="100"
              stroke="var(--color-hairline)"
              strokeWidth="0.6"
              vectorEffect="non-scaling-stroke"
            />
            <path d={area} fill={FILL[tone]} />
            <path
              d={path}
              fill="none"
              stroke={STROKE[tone]}
              strokeWidth="1.6"
              strokeLinejoin="round"
              strokeLinecap="round"
              vectorEffect="non-scaling-stroke"
            />
            {hoverCoord ? (
              <>
                <line
                  x1={hoverCoord.x}
                  x2={hoverCoord.x}
                  y1="0"
                  y2="100"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
                <circle
                  cx={hoverCoord.x}
                  cy={hoverCoord.y}
                  r="1.8"
                  fill={STROKE[tone]}
                  stroke="var(--color-panel)"
                  strokeWidth="0.6"
                  vectorEffect="non-scaling-stroke"
                />
              </>
            ) : null}
          </svg>
        </div>
      </div>
      <div className="mt-1.5 grid grid-cols-[48px_minmax(0,1fr)] gap-2">
        <span />
        <div className="flex justify-between font-mono text-[10px] text-faint tabular">
          <span>{fmtAxisDate(first.ts)}</span>
          <span>{fmtAxisDate(last.ts)}</span>
        </div>
      </div>
    </div>
  );
}
