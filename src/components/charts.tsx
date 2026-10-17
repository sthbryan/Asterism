import { Chart } from "@zovaris/sephiro";
import { useId, useMemo, useState } from "react";
import { fmtAxisDate, fmtChartAxis, fmtCompact } from "@/lib/format";

type Point = { ts: number; value: number };

const TONE_VAR: Record<string, string> = {
  accent: "var(--sph-accent)",
  muted: "var(--sph-text-muted)",
};

const DAY = 86_400;
const MIN_LABEL_GAP = 15;
const MONTH_RANGE_DAYS = 120;

function EmptyText({ text }: { text?: string }) {
  return text ? (
    <p className="py-6 text-center text-[12px] text-mist">{text}</p>
  ) : null;
}

function niceTicks(max: number) {
  if (!Number.isFinite(max) || max <= 0) return [0, 1];
  const raw = max / 4;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step =
    [1, 2, 2.5, 5, 10]
      .map((multiplier) => multiplier * magnitude)
      .find((candidate) => candidate >= raw) ?? 10 * magnitude;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let value = 0; value <= top + step / 1_000; value += step) {
    ticks.push(Math.round(value * 1e6) / 1e6);
  }
  return ticks;
}

/**
 * The library chart places one category per band, which leaves half a band
 * empty on each side. History points are timestamps, so they are positioned by
 * time instead: the line touches both edges and real gaps stay visible.
 */
export function HistoryChart({
  points,
  label,
  tone = "muted",
  emptyText,
}: {
  points: readonly Point[];
  label: string;
  tone?: "accent" | "muted";
  emptyText?: string;
}) {
  const gradientId = useId().replace(/\W/g, "");
  const [hover, setHover] = useState<number | null>(null);
  const sorted = useMemo(
    () => [...points].sort((a, b) => a.ts - b.ts),
    [points],
  );

  if (sorted.length === 0) return <EmptyText text={emptyText} />;

  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const span = last.ts - first.ts;
  const spanDays = span / DAY;
  const ticks = niceTicks(last.value);
  const top = ticks[ticks.length - 1] || 1;
  const x = (ts: number) => (span > 0 ? ((ts - first.ts) / span) * 100 : 0);
  const y = (value: number) => 100 - (value / top) * 100;

  const xs = sorted.map((point) => x(point.ts));
  const labelled: number[] = [0];
  for (let index = 1; index < sorted.length; index += 1) {
    if (xs[index] - xs[labelled[labelled.length - 1]] >= MIN_LABEL_GAP) {
      labelled.push(index);
    }
  }
  const end = sorted.length - 1;
  if (labelled[labelled.length - 1] !== end) {
    if (xs[end] - xs[labelled[labelled.length - 1]] < MIN_LABEL_GAP) {
      labelled.pop();
    }
    labelled.push(end);
  }

  const withYear =
    new Date(first.ts * 1_000).getUTCFullYear() !==
    new Date(last.ts * 1_000).getUTCFullYear();
  const bucketDays = spanDays >= MONTH_RANGE_DAYS ? 30 : 0;
  const axis = labelled.map((index) =>
    fmtChartAxis(sorted[index].ts, bucketDays, withYear),
  );
  const unique =
    new Set(axis).size === axis.length
      ? axis
      : labelled.map((index) => fmtChartAxis(sorted[index].ts, 0, withYear));

  const line =
    sorted.length === 1
      ? `M0,${y(sorted[0].value)} L100,${y(sorted[0].value)}`
      : sorted
          .map(
            (point, index) =>
              `${index === 0 ? "M" : "L"}${x(point.ts)},${y(point.value)}`,
          )
          .join(" ");
  const area = `M0,100 ${line.replace(/^M/, "L")} L100,100 Z`;
  const color = TONE_VAR[tone] ?? TONE_VAR.muted;
  const active = hover === null ? null : sorted[hover];

  return (
    <figure
      className="sph-chart pt-2"
      aria-label={`${label}: ${fmtCompact(first.value)} to ${fmtCompact(last.value)}`}
      onPointerLeave={() => setHover(null)}
    >
      <div className="flex gap-2">
        <div
          className="relative w-9 shrink-0 text-right text-[10px] text-mist tabular"
          style={{ height: 160 }}
        >
          {ticks.map((tick) => (
            <span
              key={tick}
              className="absolute right-0 -translate-y-1/2"
              style={{ bottom: `${100 - y(tick)}%` }}
            >
              {fmtCompact(tick)}
            </span>
          ))}
        </div>
        <div
          className="relative min-w-0 flex-1 border-b border-hairline"
          style={{ height: 160 }}
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            if (rect.width <= 0) return;
            const ratio = (event.clientX - rect.left) / rect.width;
            const target = first.ts + Math.min(1, Math.max(0, ratio)) * span;
            let nearest = 0;
            for (let index = 0; index < sorted.length; index += 1) {
              if (
                Math.abs(sorted[index].ts - target) <=
                Math.abs(sorted[nearest].ts - target)
              ) {
                nearest = index;
              }
            }
            setHover(nearest);
          }}
        >
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity="0.32" />
                <stop offset="100%" stopColor={color} stopOpacity="0" />
              </linearGradient>
            </defs>
            {ticks.map((tick) => (
              <line
                key={tick}
                x1="0"
                x2="100"
                y1={y(tick)}
                y2={y(tick)}
                style={{ stroke: "var(--sph-border)" }}
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            ))}
            <path d={area} fill={`url(#${gradientId})`} />
            <path
              d={line}
              fill="none"
              stroke={color}
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </svg>
          {active && (
            <>
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 w-px bg-line"
                style={{ left: `${x(active.ts)}%` }}
              />
              <span
                aria-hidden="true"
                className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                style={{
                  left: `${x(active.ts)}%`,
                  top: `${y(active.value)}%`,
                  background: color,
                }}
              />
              <div
                className="pointer-events-none absolute top-1 z-10 whitespace-nowrap rounded-md border border-hairline bg-raised px-2 py-1 text-[11px] text-paper shadow-sm"
                style={{
                  left: `${x(active.ts)}%`,
                  transform: `translateX(${x(active.ts) > 60 ? "-100%" : "0"})`,
                }}
              >
                <span className="text-faint">
                  {fmtChartAxis(active.ts, 0, true)}
                </span>{" "}
                <span className="font-mono text-ink tabular">
                  {fmtCompact(active.value)}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="relative mt-1 ml-11 h-4 text-[11px] text-mist">
        {labelled.map((index, position) => {
          const left = xs[index];
          return (
            <span
              key={`${index}-${unique[position]}`}
              className="absolute top-0 whitespace-nowrap"
              style={{
                left: `${left}%`,
                transform: `translateX(${left >= 99 ? "-100%" : left <= 1 ? "0" : "-50%"})`,
              }}
            >
              {unique[position]}
            </span>
          );
        })}
      </div>
    </figure>
  );
}

/** Daily traffic columns; Sephiro 0.11.0 expresses ColumnChart as Chart bars. */
export function TrafficChart({
  points,
  label,
  tone = "muted",
  emptyText,
}: {
  points: readonly Point[];
  label: string;
  tone?: "accent" | "muted";
  emptyText?: string;
}) {
  if (points.length === 0) return <EmptyText text={emptyText} />;
  return (
    <Chart
      label={label}
      variant="bar"
      height={96}
      categories={points.map((point) => fmtAxisDate(point.ts))}
      series={[
        {
          name: label,
          values: points.map((point) => point.value),
          tone,
        },
      ]}
      legend={false}
    />
  );
}
