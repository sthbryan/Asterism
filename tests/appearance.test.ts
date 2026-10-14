import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  applyDocumentAppearance,
  applyWindowChrome,
  isThemePreset,
  presetSupportsMode,
  readStoredPreset,
  saveAppearance,
  sephiroTheme,
} from "../src/lib/appearance";

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
const originalDocument = Object.getOwnPropertyDescriptor(
  globalThis,
  "document",
);
let storage: Map<string, string>;
let root: { dataset: Record<string, string>; style: { colorScheme: string } };

beforeEach(() => {
  storage = new Map();
  root = { dataset: {}, style: { colorScheme: "" } };
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    },
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { documentElement: root },
  });
});

afterEach(() => {
  for (const [key, descriptor] of [
    ["window", originalWindow],
    ["document", originalDocument],
  ] as const) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else Reflect.deleteProperty(globalThis, key);
  }
});

test("window chrome is a no-op outside Tauri", async () => {
  await expect(applyWindowChrome("dark", false)).resolves.toBeUndefined();
});

describe("Sephiro appearance", () => {
  test("the installed Asterism palette is neutral carbon with readable text", () => {
    const css = readFileSync(
      "node_modules/@zovaris/sephiro/dist/themes.css",
      "utf8",
    );
    const palette = css.match(
      /\[data-sephiro-theme="asterism"\] \{([^}]+)\}/,
    )?.[1];
    expect(palette).toBeDefined();
    const token = (name: string) =>
      palette?.match(new RegExp(`--sph-${name}: (#[a-f0-9]{6})`))?.[1] ?? "";
    const luminance = (hex: string) => {
      const rgb =
        hex
          .slice(1)
          .match(/../g)
          ?.map((value) => {
            const c = Number.parseInt(value, 16) / 255;
            return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          }) ?? [];
      return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
    };
    expect(token("bg")).toBe("#111111");
    expect(token("surface")).toBe("#1c1c1c");
    expect(
      (luminance(token("text-muted")) + 0.05) /
        (luminance(token("surface")) + 0.05),
    ).toBeGreaterThan(4.5);
    expect(
      (luminance(token("on-accent")) + 0.05) /
        (luminance(token("accent")) + 0.05),
    ).toBeGreaterThan(4.5);
  });
  test("legacy preferences default to carbon without replacing explicit presets", () => {
    expect(readStoredPreset()).toBe("asterism");
    storage.set("asterism:theme", "light");
    expect(readStoredPreset()).toBe("asterism");
    storage.set("asterism:theme", "system");
    expect(readStoredPreset()).toBe("asterism");
    storage.set("asterism:theme-preset", "unknown");
    expect(readStoredPreset()).toBe("asterism");
    storage.set("asterism:theme-preset", "pulso");
    expect(readStoredPreset()).toBe("pulso");
  });

  test("preset identity is independent of light/dark mode", () => {
    expect(sephiroTheme("default", "light")).toBe("light");
    expect(sephiroTheme("default", "dark")).toBe("dark");
    expect(sephiroTheme("pulso", "light")).toBe("pulso");
    expect(presetSupportsMode("pulso")).toBe(true);
    expect(presetSupportsMode("asterism")).toBe(false);
    expect(presetSupportsMode("fizza")).toBe(false);
    expect(isThemePreset("unknown")).toBe(false);
  });

  test("document, reload preferences, and mock save agree without Tauri", async () => {
    applyDocumentAppearance("system", "light", true, "pulso");
    expect(root.dataset).toEqual({
      theme: "light",
      sephiroTheme: "pulso",
      themePref: "system",
      transparency: "on",
    });
    expect(root.style.colorScheme).toBe("light");
    expect(storage.get("asterism:transparency")).toBe("1");
    expect(readStoredPreset()).toBe("pulso");
    await applyWindowChrome("light", true);
    expect(await saveAppearance("dark", false, "fizza")).toMatchObject({
      theme: "dark",
      themePreset: "fizza",
      transparency: false,
    });
    expect(readStoredPreset()).toBe("fizza");
  });
});
