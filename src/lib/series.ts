import type { RepoHistory, SeriesPoint, TrafficDay } from "./types";

export const DAY = 86_400;

export function dayBucket(ts: number) {
  return Math.floor(ts / DAY) * DAY;
}

function valueAt(series: SeriesPoint[], ts: number) {
  let last = 0;
  for (const point of series) {
    if (point.ts <= ts) last = point.value;
    else break;
  }
  return last;
}

export function aggregateHistory(
  history: Record<string, RepoHistory>,
  names: string[],
  key: "stars" | "downloads" | "forks",
): SeriesPoint[] {
  const seriesList = names
    .map((name) => history[name]?.[key] ?? [])
    .filter((series) => series.length > 0)
    .map((series) => [...series].sort((a, b) => a.ts - b.ts));
  if (seriesList.length === 0) return [];

  const stamps = new Set<number>();
  for (const series of seriesList) {
    for (const point of series) stamps.add(dayBucket(point.ts));
  }
  const timestamps = [...stamps].sort((a, b) => a - b);
  return timestamps.map((ts) => ({
    ts,
    value: seriesList.reduce((sum, series) => sum + valueAt(series, ts), 0),
  }));
}

export function fillTrafficDays(
  days: TrafficDay[] | undefined,
  n = 14,
): TrafficDay[] {
  const today = dayBucket(Math.floor(Date.now() / 1000));
  const start = today - (n - 1) * DAY;
  const byDay = new Map((days ?? []).map((day) => [dayBucket(day.ts), day]));
  const out: TrafficDay[] = [];
  for (let ts = start; ts <= today; ts += DAY) {
    out.push(byDay.get(ts) ?? { ts, count: 0, uniques: 0 });
  }
  return out;
}

export function delta(points: SeriesPoint[]) {
  if (points.length < 2) return null;
  return points[points.length - 1].value - points[0].value;
}

export type WindowDelta = {
  value: number;
  spanDays: number;
  partial: boolean;
};

export type SeriesWindow = {
  points: SeriesPoint[];
  fromTs: number;
  toTs: number;
  observedFromTs: number | null;
  observedToTs: number | null;
  partial: boolean;
};

/** Select a relative window without fabricating points up to the query time. */
export function seriesWindow(
  points: SeriesPoint[],
  days: number,
  referenceTs?: number,
): SeriesWindow | null {
  if (points.length === 0) return null;
  const series = [...points].sort((a, b) => a.ts - b.ts);
  const toTs = referenceTs ?? series[series.length - 1].ts;
  const fromTs = toTs - days * DAY;
  const baseline = [...series].reverse().find((point) => point.ts <= fromTs);
  const inRange = series.filter(
    (point) => point.ts >= fromTs && point.ts <= toTs,
  );
  const selected =
    inRange.length > 0 && baseline ? [baseline, ...inRange] : inRange;
  return {
    points: selected,
    fromTs,
    toTs,
    observedFromTs: inRange[0]?.ts ?? null,
    observedToTs: inRange[inRange.length - 1]?.ts ?? null,
    partial: !baseline || (inRange[inRange.length - 1]?.ts ?? -Infinity) < toTs,
  };
}

export function windowDelta(
  points: SeriesPoint[],
  days: number,
  referenceTs?: number,
): WindowDelta | null {
  const selected = seriesWindow(points, days, referenceTs);
  if (!selected || selected.points.length < 2) return null;
  const first = selected.points[0];
  const last = selected.points[selected.points.length - 1];
  const partial =
    selected.points[0].ts > selected.fromTs || last.ts < selected.toTs;
  const spanDays = partial
    ? Math.max(1, Math.round((last.ts - first.ts) / DAY))
    : days;
  return {
    value: last.value - first.value,
    spanDays,
    partial,
  };
}

export function pickKpiDelta(
  window: WindowDelta | null,
  fallback: number | null | undefined,
  days = 7,
): { delta: number; hint: string } | null {
  if (window && window.value !== 0) {
    return {
      delta: window.value,
      hint: window.partial ? `${window.spanDays}d` : `${days}d`,
    };
  }
  if (fallback != null && fallback !== 0) {
    return { delta: fallback, hint: "sync" };
  }
  return null;
}

export function sumDeltas(values: Array<number | null | undefined>) {
  const present = values.filter((value): value is number => value != null);
  if (present.length === 0) return null;
  return present.reduce((sum, value) => sum + value, 0);
}
