import type { SeriesPoint, TrafficDay } from "../types";

const NOW = Date.now();

const DAY = 86_400;

export function curve(days: number, start: number, end: number): SeriesPoint[] {
  const today = Math.floor(NOW / 1000 / DAY) * DAY;
  const out: SeriesPoint[] = [];
  for (let i = days; i >= 0; i--) {
    const progress = 1 - i / days;
    const eased = progress * progress;
    const wobble = Math.sin(i * 0.7) * Math.max(1, (end - start) * 0.012);
    out.push({
      ts: today - i * DAY,
      value: Math.max(0, Math.round(start + (end - start) * eased + wobble)),
    });
  }
  out[out.length - 1].value = end;
  return out;
}

export function trafficDays(total: number, uniques: number): TrafficDay[] {
  const today = Math.floor(NOW / 1000 / DAY) * DAY;
  const days: TrafficDay[] = [];
  let remaining = total;
  let remainingU = uniques;
  for (let i = 13; i >= 0; i--) {
    const share = 0.04 + ((13 - i) / 13) * 0.08 + (i % 3 === 0 ? 0.03 : 0);
    const count = i === 0 ? remaining : Math.max(0, Math.round(total * share));
    const uniq = Math.min(
      count,
      i === 0 ? remainingU : Math.max(0, Math.round(uniques * share * 0.7)),
    );
    remaining = Math.max(0, remaining - count);
    remainingU = Math.max(0, remainingU - uniq);
    days.push({ ts: today - i * DAY, count, uniques: uniq });
  }
  return days;
}
