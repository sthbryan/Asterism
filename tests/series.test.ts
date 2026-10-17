import { describe, expect, test } from "bun:test";
import {
  aggregateHistory,
  pickKpiDelta,
  seriesWindow,
  windowDelta,
} from "@/lib/series";

const day = 86_400;

describe("series windows", () => {
  test("computes exact 7 and 30 day deltas at boundaries", () => {
    const points = [
      { ts: 0, value: 10 },
      { ts: 7 * day, value: 17 },
      { ts: 30 * day, value: 40 },
    ];
    expect(windowDelta(points, 7)).toEqual({
      value: 23,
      spanDays: 7,
      partial: false,
    });
    expect(windowDelta(points, 30)).toEqual({
      value: 30,
      spanDays: 30,
      partial: false,
    });
    expect(pickKpiDelta(windowDelta(points, 30), null, 30)?.hint).toBe("30d");
  });

  test("marks a window partial when there is no baseline", () => {
    expect(
      windowDelta(
        [
          { ts: 10 * day, value: 5 },
          { ts: 12 * day, value: 9 },
        ],
        7,
      ),
    ).toEqual({ value: 4, spanDays: 2, partial: true });
    expect(windowDelta([{ ts: 1, value: 5 }], 7)).toBeNull();
  });

  test("aggregates the complete history across repositories", () => {
    const history = {
      a: { stars: [{ ts: 0, value: 10 }], downloads: [], forks: [] },
      b: { stars: [{ ts: 3 * day, value: 5 }], downloads: [], forks: [] },
    };
    expect(aggregateHistory(history, ["a", "b"], "stars")).toEqual([
      { ts: 0, value: 10 },
      { ts: 3 * day, value: 15 },
    ]);
  });

  test("keeps available history when a selected repo has no samples", () => {
    const history = {
      a: { stars: [{ ts: 0, value: 10 }], downloads: [], forks: [] },
      b: { stars: [], downloads: [], forks: [] },
    };
    expect(aggregateHistory(history, ["a", "b"], "stars")).toEqual([
      { ts: 0, value: 10 },
    ]);
  });

  test("preserves old windows as partial coverage rather than current data", () => {
    const points = [
      { ts: 100 * day, value: 20 },
      { ts: 101 * day, value: 21 },
    ];
    expect(windowDelta(points, 30)).toEqual({
      value: 1,
      spanDays: 1,
      partial: true,
    });
  });

  test("keeps the baseline immediately before the cutoff", () => {
    const points = [
      { ts: 0, value: 1 },
      { ts: 2 * day, value: 3 },
      { ts: 8 * day, value: 9 },
    ];
    expect(seriesWindow(points, 7, 8 * day)).toEqual({
      points: [
        { ts: 0, value: 1 },
        { ts: 2 * day, value: 3 },
        { ts: 8 * day, value: 9 },
      ],
      fromTs: day,
      toTs: 8 * day,
      observedFromTs: 2 * day,
      observedToTs: 8 * day,
      partial: false,
    });
  });

  test("does not extend an old cached series to now", () => {
    const old = [
      { ts: 100 * day, value: 4 },
      { ts: 101 * day, value: 5 },
    ];
    const result = seriesWindow(old, 7, 200 * day);
    expect(result?.points).toEqual([]);
    expect(result?.toTs).toBe(200 * day);
    expect(result?.observedFromTs).toBeNull();
  });

  test("anchors KPI deltas to the reference and rejects stale windows", () => {
    const points = [
      { ts: 0, value: 10 },
      { ts: 7 * day, value: 17 },
    ];
    expect(windowDelta(points, 7, 7 * day)).toEqual({
      value: 7,
      spanDays: 7,
      partial: false,
    });
    expect(windowDelta(points, 7, 30 * day)).toBeNull();
  });
});
