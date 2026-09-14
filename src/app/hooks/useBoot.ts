import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { getCache, getConfig, getStatus, isMockMode } from "../../lib/api";
import {
  applyDocumentLocale,
  detectLocale,
  readStoredLocale,
} from "../../lib/i18n/locale";
import type { Status } from "../../lib/types";
import { detailPath } from "../routes";
import { useStore } from "../store";

function resolveInitialRoute(current: string): string {
  if (isMockMode()) {
    const params = new URLSearchParams(window.location.search);
    const screenParam = params.get("screen");
    if (screenParam === "settings") return "/settings";
    if (screenParam === "create") return "/create";
    if (screenParam === "picker") return "/repos";
    if (screenParam === "detail") {
      return detailPath(params.get("repo") ?? "sthbryan/hyperion");
    }
  }
  return current === "/boot" || current === "/setup" || !current
    ? "/"
    : current;
}

function bootErrorStatus(err: unknown): Status {
  return {
    ok: false,
    login: null,
    error: String(err),
    hint: "Install GitHub CLI from https://cli.github.com and run gh auth login.",
  };
}

/** Load preferences before connecting, then cache, route and GitHub data. */
export function useBoot() {
  const bootAttempt = useStore((s) => s.bootAttempt);
  const setPreferences = useStore((s) => s.setPreferences);
  const bootOk = useStore((s) => s.bootOk);
  const bootFail = useStore((s) => s.bootFail);
  const runRefresh = useStore((s) => s.runRefresh);
  const loadCatalog = useStore((s) => s.loadCatalog);

  const [path, navigate] = useLocation();
  const pathRef = useRef(path);
  pathRef.current = path;

  // biome-ignore lint/correctness/useExhaustiveDependencies: bootAttempt is an intentional re-run signal for boot retry; it is read via bootAttempt dep, not inside the effect.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await getConfig();
        if (cancelled) return;
        applyDocumentLocale(cfg.locale ?? readStoredLocale() ?? detectLocale());
        setPreferences(cfg);
        const next = await getStatus();
        if (cancelled) return;
        if (!next.ok) {
          bootFail(next);
          if (pathRef.current !== "/settings")
            navigate("/setup", { replace: true });
          return;
        }
        const cache = await getCache();
        if (cancelled) return;
        bootOk(next, cfg, cache);
        navigate(resolveInitialRoute(pathRef.current), { replace: true });
        void loadCatalog();
        if (cfg.repos.length > 0) {
          void runRefresh();
        }
      } catch (err) {
        if (cancelled) return;
        bootFail(bootErrorStatus(err));
        navigate("/setup", { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    bootAttempt,
    setPreferences,
    bootOk,
    bootFail,
    loadCatalog,
    navigate,
    runRefresh,
  ]);
}
