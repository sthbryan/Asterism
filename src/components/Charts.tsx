import { useMemo, useState } from "react";
import { fmtAxisDate, fmtAxisDateLong, fmtCompact, fmtNum } from "../lib/format";
import type { SeriesPoint } from "../lib/types";

export function BarChart({
  items,
  onSelect,
}: {
  items: { label: string; value: number; color?: string }[];
  onSelect?: (label: string) => void;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <ul>
      {items.map((item, index) => {
        const pct = (item.value / max) * 100;
        const name = /^[^/]+\/[^/]+$/.test(item.label)
          ? (item.label.split("/")[1] ?? item.label)
          : item.label;
        const top = index === 0 && item.value > 0;
        const rowClass = `grid w-full grid-cols-[minmax(0,140px)_1fr_56px] items-center gap-3 py-2 text-left ${
          onSelect ? "rounded-md transition-colors hover:bg-white/[0.03]" : ""
        }`;
        const body = (
          <>
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: item.color ?? "#6f6f6f" }}
              />
              <span className="truncate text-[12.5px] font-medium">{name}</span>
            </span>
            <span className="block h-1.5 overflow-hidden rounded-full bg-raised">
              <span
                className={`block h-full rounded-full transition-[width] duration-500 ${
                  top ? "bg-gradient-to-r from-accent to-accent-hover" : "bg-[#707070]"
                }`}
                style={{ width: `${Math.max(pct, item.value > 0 ? 3 : 0)}%` }}
              />
            </span>
            <span
              className={`text-right font-mono text-[11.5px] tabular ${
                top ? "font-semibold text-paper" : "text-mist"
              }`}
            >
              {fmtCompact(item.value)}
            </span>
          </>
        );
        return (
          <li key={item.label} className="border-b border-hairline first:pt-0 last:border-b-0 last:pb-0">
            {onSelect ? (
              <button type="button" onClick={() => onSelect(item.label)} className={rowClass}>
                {body}
              </button>
            ) : (
              <div className={rowClass}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

const STROKE = {
  accent: "var(--color-accent-soft)",
  paper: "#c8c8c8",
};

const FILL = {
  accent: "color-mix(in srgb, var(--color-accent) 22%, transparent)",
  paper: "rgba(236, 236, 236, 0.08)",
};

export function AreaChart({
  points,
  tone = "paper",
  empty,
}: {
  points: SeriesPoint[];
  tone?: "accent" | "paper";
  empty?: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const plot = useMemo(() => buildPlot(points), [points]);

  if (!plot) {
    return (
      <div className="grid h-[132px] place-items-center px-2 text-center text-[12.5px] leading-relaxed text-faint">
        {empty ?? "Not enough samples yet."}
      </div>
    );
  }

  const { path, area, coords, max, first, last } = plot;
  const hover = active != null ? points[active] : last;
  const hoverCoord = active != null ? coords[active] : coords[coords.length - 1];

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
            aria-label="History chart"
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

export function ColumnChart({
  items,
  tone = "paper",
  empty,
}: {
  items: { ts: number; value: number; hint?: string }[];
  tone?: "accent" | "paper";
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

function buildPlot(points: SeriesPoint[]) {
  const series = points.filter((point) => Number.isFinite(point.ts) && Number.isFinite(point.value));
  if (series.length === 0) return null;
  const first = series[0];
  const last = series[series.length - 1];
  const max = Math.max(...series.map((point) => point.value), 1);
  const minTs = first.ts;
  const span = Math.max(last.ts - minTs, 1);
  const coords =
    series.length === 1
      ? [
          { x: 0, y: yOf(first.value, max) },
          { x: 100, y: yOf(first.value, max) },
        ]
      : series.map((point) => ({
          x: ((point.ts - minTs) / span) * 100,
          y: yOf(point.value, max),
        }));
  const path = coords
    .map((coord, index) => `${index === 0 ? "M" : "L"}${coord.x.toFixed(2)},${coord.y.toFixed(2)}`)
    .join(" ");
  const area = `${path} L100,100 L0,100 Z`;
  return { path, area, coords: series.length === 1 ? [{ x: 100, y: yOf(first.value, max) }] : coords, max, first, last };
}

function yOf(value: number, max: number) {
  return 100 - (value / max) * 92 - 4;
}

