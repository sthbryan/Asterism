import { Chart } from "@zovaris/sephiro";
import { fmtAxisDate, fmtAxisDateLong, fmtCompact } from "@/lib/format";

type Point = { ts: number; value: number };

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
  return (
    <Chart
      label={label}
      variant="area"
      height={160}
      categories={points.map((point) => fmtAxisDateLong(point.ts))}
      series={[
        {
          name: label,
          values: points.map((point) => point.value),
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
