import type { SeriesPoint } from "../../lib/types";

export type ChartTone = "accent" | "paper";

export const STROKE: Record<ChartTone, string> = {
  accent: "var(--color-accent-soft)",
  paper: "#c8c8c8",
};

export const FILL: Record<ChartTone, string> = {
  accent: "color-mix(in srgb, var(--color-accent) 22%, transparent)",
  paper: "rgba(236, 236, 236, 0.08)",
};

export interface PlotCoord {
  x: number;
  y: number;
}

export interface Plot {
  path: string;
  area: string;
  coords: PlotCoord[];
  max: number;
  first: SeriesPoint;
  last: SeriesPoint;
}

export function buildPlot(points: SeriesPoint[]): Plot | null {
  const series = points.filter(
    (point) => Number.isFinite(point.ts) && Number.isFinite(point.value),
  );
  if (series.length === 0) return null;
  const first = series[0];
  const last = series[series.length - 1];
  const max = Math.max(...series.map((point) => point.value), 1);
  const minTs = first.ts;
  const span = Math.max(last.ts - minTs, 1);
  const coords: PlotCoord[] =
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
  return {
    path,
    area,
    coords: series.length === 1 ? [{ x: 100, y: yOf(first.value, max) }] : coords,
    max,
    first,
    last,
  };
}

export function yOf(value: number, max: number): number {
  return 100 - (value / max) * 92 - 4;
}
