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
  test("pull request namespace resolves user-facing labels", () => {
    expect(translate("es", "pulls.title")).toBe("Pull requests");
    expect(translate("en", "pulls.refresh")).toBe("Refresh");
    expect(translate("es", "offline.checking")).toBe("Comprobando conexión…");
  });

  test("both languages contain the same nonempty messages and placeholders", () => {
    function compareTrees(english: unknown, spanish: unknown) {
      expect(typeof spanish).toBe(typeof english);
      if (typeof english === "string") {
        expect(english.trim().length).toBeGreaterThan(0);
        expect(String(spanish).trim().length).toBeGreaterThan(0);
        expect(english.match(/\{\w+\}/g)?.sort() ?? []).toEqual(
          String(spanish)
            .match(/\{\w+\}/g)
            ?.sort() ?? [],
        );
        return;
      }
      if (typeof english !== "object" || english === null) return;
      const spanishObject = spanish as Record<string, unknown>;
      for (const [key, value] of Object.entries(english)) {
        expect(Object.hasOwn(spanishObject, key)).toBe(true);
        compareTrees(value, spanishObject[key]);
      }
    }

    compareTrees(en, es);
    function compareKeys(english: unknown, spanish: unknown) {
      if (typeof english !== "object" || english === null) return;
      const englishObject = english as Record<string, unknown>;
      const spanishObject = spanish as Record<string, unknown>;
      expect(Object.keys(englishObject).sort()).toEqual(
        Object.keys(spanishObject).sort(),
      );
      for (const key of Object.keys(englishObject)) {
        compareKeys(englishObject[key], spanishObject[key]);
      }
    }
    compareKeys(en, es);
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
