import type { MouseEvent as ReactMouseEvent } from "react";

const IGNORE =
  "button, a, input, textarea, select, [role='button'], [role='switch'], [data-no-drag]";

export function dragWindow(event: ReactMouseEvent) {
  if (event.button !== 0) return;
  const node = event.target;
  if (!(node instanceof Element)) return;
  if (node.closest(IGNORE)) return;
  void import("@tauri-apps/api/window")
    .then(({ getCurrentWindow }) => getCurrentWindow().startDragging())
    .catch(() => undefined);
}
