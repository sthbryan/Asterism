import { describe, expect, test } from "bun:test";
import {
  en,
  es,
  formatDateFor,
  formatNumberFor,
  formatRelativeTime,
  translate,
} from "../src/lib/i18n";
import { normalizeLocale } from "../src/lib/i18n/locale";
import { enqueuePreference } from "../src/lib/preferences";

describe("translations", () => {
  test("both languages contain the same nonempty messages and placeholders", () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(es).sort());
    for (const [key, english] of Object.entries(en)) {
      const spanish = es[key];
      expect(typeof english).toBe(typeof spanish);
      const variants =
        typeof english === "string"
          ? [[english, spanish]]
          : Object.entries(english).map(([form, text]) => [
              text,
              (spanish as Record<string, string>)[form],
            ]);
      for (const [left, right] of variants) {
        expect(typeof right).toBe("string");
        expect(String(right).trim().length).toBeGreaterThan(0);
        expect(
          String(left)
            .match(/\{\w+\}/g)
            ?.sort() ?? [],
        ).toEqual(
          String(right)
            .match(/\{\w+\}/g)
            ?.sort() ?? [],
        );
      }
    }
  });
  test("singular, plural and interpolation follow the selected language", () => {
    expect(translate("es", "common.repos", { count: 1 })).toBe("1 repositorio");
    expect(translate("es", "common.repos", { count: 0 })).toBe(
      "0 repositorios",
    );
    expect(translate("en", "common.repos", { count: 2 })).toBe(
      "2 repositories",
    );
    expect(translate("es", "list.noResults", { query: "<script>" })).toBe(
      "Sin resultados para «<script>»",
    );
    expect(translate("en", "missing.message")).toBe("missing.message");
    expect(normalizeLocale("fr")).toBe("en");
  });
  test("number, date and relative formatters honor locale", () => {
    expect(formatNumberFor("es", 12345.6)).toBe("12.345,6");
    expect(formatNumberFor("en", 12345.6)).toBe("12,345.6");
    const date = new Date("2026-09-13T12:00:00Z");
    expect(formatDateFor("es", date, { month: "long", timeZone: "UTC" })).toBe(
      "septiembre",
    );
    expect(formatDateFor("en", date, { month: "long", timeZone: "UTC" })).toBe(
      "September",
    );
    expect(formatRelativeTime("es", date, date.getTime() + 86400000)).toBe(
      "ayer",
    );
  });
});

test("preference writes stay ordered and recover after an error", async () => {
  const values: string[] = [];
  let release: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const first = enqueuePreference(async () => {
    await gate;
    values.push("es");
  });
  const failed = enqueuePreference(async () => {
    values.push("failed");
    throw new Error("disk unavailable");
  });
  const last = enqueuePreference(async () => {
    values.push("dark");
  });
  expect(values).toEqual([]);
  const rejection = failed.catch((error: Error) => error.message);
  release();
  await first;
  expect(await rejection).toBe("disk unavailable");
  await last;
  expect(values).toEqual(["es", "failed", "dark"]);
});
