import { useCallback, useRef } from "react";
import type { VListHandle } from "virtua";

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

/**
 * Same memory, but owned by a virtualized list: the offset lives in the list's
 * own viewport, so it is read back through the handle instead of a DOM node.
 */
export function useListMemory(key: string) {
  const restored = useRef(false);
  // Restore on the first handle, not on mount: a skeleton can delay the list.
  const ref = useCallback(
    (handle: VListHandle | null) => {
      if (!handle || restored.current) return;
      restored.current = true;
      const target = positions.get(key);
      if (!target) return;
      let frames = 0;
      const step = () => {
        handle.scrollTo(target);
        if (++frames > RESTORE_FRAMES) return;
        if (Math.abs(handle.scrollOffset - target) > 1) {
          requestAnimationFrame(step);
        }
      };
      requestAnimationFrame(step);
    },
    [key],
  );
  const onScroll = useCallback(
    (offset: number) => {
      positions.set(key, offset);
    },
    [key],
  );
  return { ref, onScroll };
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
