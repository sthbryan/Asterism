import { Chart } from "@zovaris/sephiro";
import { fmtAxisDate, fmtChartAxis, fmtCompact } from "@/lib/format";
import { compactSeries } from "@/lib/series";

type Point = { ts: number; value: number };

function axis(points: readonly Point[]) {
  const { points: shown, bucketDays } = compactSeries(points);
  const first = shown[0];
  const last = shown[shown.length - 1];
  const withYear =
    Boolean(first && last) &&
    new Date(first.ts * 1_000).getUTCFullYear() !==
      new Date(last.ts * 1_000).getUTCFullYear();
  const labels = shown.map((point) =>
    fmtChartAxis(point.ts, bucketDays, withYear),
  );
  return {
    points: shown,
    labels:
      new Set(labels).size === labels.length
        ? labels
        : shown.map((point) => fmtChartAxis(point.ts, 1, withYear)),
  };
}

function EmptyText({ text }: { text?: string }) {
  return text ? (
    <p className="py-6 text-center text-[12px] text-mist">{text}</p>
  ) : null;
}

/**
 * Sephiro 0.11.0 replaced TimeSeriesChart with Chart. This adapter keeps the
 * timestamp samples, the value formatting, and the empty text the app owns.
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
  if (points.length === 0) return <EmptyText text={emptyText} />;
  const chart = axis(points);
  return (
    <Chart
      label={label}
      variant="area"
      height={160}
      categories={chart.labels}
      series={[
        {
          name: label,
          values: chart.points.map((point) => point.value),
          tone,
        },
      ]}
      format={fmtCompact}
      legend={false}
    />
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
