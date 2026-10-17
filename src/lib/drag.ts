import type { MouseEvent as ReactMouseEvent } from "react";

const IGNORE =
  "button, a, input, textarea, select, [role='button'], [role='switch'], [data-no-drag]";

/** The native macOS window draws its traffic lights over the page bar. */
export function hasTrafficLights() {
  return (
    typeof window !== "undefined" &&
    "__TAURI_INTERNALS__" in window &&
    navigator.userAgent.includes("Mac")
  );
}

export function dragWindow(event: ReactMouseEvent) {
  if (event.button !== 0) return;
  const node = event.target;
  if (!(node instanceof Element)) return;
  if (node.closest(IGNORE)) return;
  void import("@tauri-apps/api/window")
    .then(({ getCurrentWindow }) => getCurrentWindow().startDragging())
    .catch(() => undefined);
}
