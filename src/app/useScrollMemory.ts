import { useCallback } from "react";

const positions = new Map<string, number>();
const RESTORE_FRAMES = 30;

function restore(node: HTMLElement, target: number) {
  let frames = 0;
  let stopped = false;
  const stop = () => {
    stopped = true;
    node.removeEventListener("wheel", stop);
    node.removeEventListener("touchstart", stop);
  };
  const step = () => {
    if (stopped) return;
    node.scrollTop = target;
    if (node.scrollTop === target) {
      stop();
      return;
    }
    if (++frames > RESTORE_FRAMES) {
      stop();
      return;
    }
    requestAnimationFrame(step);
  };
  node.addEventListener("wheel", stop, { passive: true, once: true });
  node.addEventListener("touchstart", stop, { passive: true, once: true });
  step();
}

export function useScrollMemory(key: string) {
  return useCallback(
    (node: HTMLDivElement | null) => {
      if (!node) return;
      const target = positions.get(key);
      if (target) restore(node, target);
      let frame = 0;
      const onScroll = () => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          positions.set(key, node.scrollTop);
        });
      };
      node.addEventListener("scroll", onScroll, { passive: true });
      return () => {
        positions.set(key, node.scrollTop);
        if (frame) cancelAnimationFrame(frame);
        node.removeEventListener("scroll", onScroll);
      };
    },
    [key],
  );
}
