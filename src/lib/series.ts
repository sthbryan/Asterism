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

export function fillTrafficDays(days: TrafficDay[] | undefined, n = 14): TrafficDay[] {
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

export function windowDelta(points: SeriesPoint[], days: number): WindowDelta | null {
  if (points.length < 2) return null;
  const series = [...points].sort((a, b) => a.ts - b.ts);
  const last = series[series.length - 1];
  const first = series[0];
  const cutoff = last.ts - days * DAY;
  const partial = first.ts > cutoff;
  const before = valueAt(series, cutoff);
  const startValue = partial ? first.value : before;
  const spanDays = Math.max(1, Math.round((last.ts - (partial ? first.ts : cutoff)) / DAY));
  return {
    value: last.value - startValue,
    spanDays,
    partial,
  };
}

export function pickKpiDelta(
  window: WindowDelta | null,
  fallback: number | null | undefined,
): { delta: number; hint: string } | null {
  if (window && window.value !== 0) {
    return { delta: window.value, hint: window.partial ? `${window.spanDays}d` : "7d" };
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
