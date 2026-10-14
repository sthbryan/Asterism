import { expect, test } from "bun:test";
import { applyWindowChrome } from "../src/lib/appearance";

test("window chrome is a no-op outside Tauri", async () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {},
  });
  try {
    await expect(applyWindowChrome("dark", false)).resolves.toBeUndefined();
  } finally {
    if (descriptor) Object.defineProperty(globalThis, "window", descriptor);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
