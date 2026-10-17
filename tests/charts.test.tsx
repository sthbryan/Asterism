import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { TrafficChart } from "@/components/charts";

const DAY = 86_400;
const start = Date.UTC(2026, 8, 14) / 1_000;
const days = Array.from({ length: 14 }, (_, index) => ({
  ts: start + index * DAY,
  value: (index * 7) % 40,
}));

function labels(html: string) {
  return [...html.matchAll(/>([A-Z][a-z]{2} \d{1,2})</g)].map(
    (match) => match[1],
  );
}

describe("traffic chart", () => {
  test("keeps one bar per day", () => {
    const html = renderToStaticMarkup(
      <TrafficChart points={days} label="Views" />,
    );
    expect(html).toContain('aria-label="Views: 14 days"');
    expect(html.match(/opacity="0\.85"/g) ?? []).toHaveLength(14);
  });

  test("labels few days so the text is never cut", () => {
    const html = renderToStaticMarkup(
      <TrafficChart points={days} label="Views" />,
    );
    const shown = labels(html);
    expect(shown.length).toBeGreaterThanOrEqual(3);
    expect(shown.length).toBeLessThanOrEqual(5);
    expect(new Set(shown).size).toBe(shown.length);
    for (const label of shown) expect(label).not.toContain("…");
  });

  test("keeps the newest day labelled", () => {
    const html = renderToStaticMarkup(
      <TrafficChart points={days} label="Views" />,
    );
    expect(labels(html).at(-1)).toBe("Sep 27");
  });

  test("renders a single day without a band of empty labels", () => {
    const html = renderToStaticMarkup(
      <TrafficChart points={[{ ts: start, value: 3 }]} label="Views" />,
    );
    expect(html).toContain('aria-label="Views: 1 day"');
    expect(labels(html)).toEqual(["Sep 14"]);
  });
});
