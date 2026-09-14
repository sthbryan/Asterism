import { useCallback } from "react";
import { flushSync } from "react-dom";
import { useLocation } from "wouter";

type NavigateFn = ReturnType<typeof useLocation>[1];

type StartViewTransition = (update: () => void | Promise<void>) => {
  finished: Promise<void>;
};

function getViewTransition(): StartViewTransition | null {
  if (typeof document === "undefined") return null;
  const fn = (document as Document & { startViewTransition?: unknown })
    .startViewTransition;
  if (typeof fn !== "function") return null;
  if (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return null;
  }
  return (fn as StartViewTransition).bind(document);
}

/**
 * Wouter `navigate` wrapped in `document.startViewTransition()` when
 * available. Falls back to a plain navigation (the existing CSS
 * `.t-page-slide` animation covers it) on browsers without support —
 * e.g. Tauri's WKWebView — and when `prefers-reduced-motion` is set.
 */
export function useTransitionNavigate(): NavigateFn {
  const [path, navigate] = useLocation();
  return useCallback<NavigateFn>(
    (to, options) => {
      if (to === path) {
        navigate(to, options);
        return;
      }
      const start = getViewTransition();
      if (!start) {
        navigate(to, options);
        return;
      }
      start(() => {
        try {
          flushSync(() => {
            navigate(to, options);
          });
        } catch {
          navigate(to, options);
        }
      });
    },
    [navigate, path],
  );
}
