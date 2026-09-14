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

export function useTransitionNavigate(): NavigateFn {
  const [path, navigate] = useLocation();
  return useCallback<NavigateFn>(
    (to, options) => {
      if (to === path) return;
      const start = getViewTransition();
      if (!start) {
        navigate(to, options);
        return;
      }
      const root = document.documentElement;
      root.classList.add("vt-active");
      const done = () => root.classList.remove("vt-active");
      try {
        start(() => {
          try {
            flushSync(() => {
              navigate(to, options);
            });
          } catch {
            navigate(to, options);
          }
        }).finished.then(done, done);
      } catch {
        done();
        navigate(to, options);
      }
    },
    [navigate, path],
  );
}
