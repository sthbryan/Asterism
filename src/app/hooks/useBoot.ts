import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { detailPath } from "@/app/routes";
import { useStore } from "@/app/store";
import {
  applyDocumentLocale,
  detectLocale,
  readStoredLocale,
} from "@/lib/i18n/locale";
import type { Status } from "@/lib/types";
import { getLocalState, getStatus, isMockMode } from "@/services/api";

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
    kind: "storage",
    login: null,
    error: String(err),
    hint: "Install GitHub CLI from https://cli.github.com and run gh auth login.",
  };
}

/** Load preferences before connecting, then cache, route and GitHub data. */
export function useBoot() {
  const bootAttempt = useStore((s) => s.bootAttempt);
  const setPreferences = useStore((s) => s.setPreferences);
  const hydrateLocal = useStore((s) => s.hydrateLocal);
  const setConnecting = useStore((s) => s.setConnecting);
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
        setConnecting(true);
        const local = await getLocalState();
        if (cancelled) return;
        applyDocumentLocale(
          local.config.locale ?? readStoredLocale() ?? detectLocale(),
        );
        setPreferences(local.config);
        hydrateLocal(local);
        navigate(resolveInitialRoute(pathRef.current), { replace: true });
        const next = await getStatus();
        if (cancelled) return;
        if (!next.ok) {
          bootFail(next);
          return;
        }
        // getStatus selects the authenticated account. Reload its namespace before
        // displaying live data; never merge another account into the local snapshot.
        if (next.login !== local.account?.split("/").pop()) {
          hydrateLocal({
            ...local,
            account: null,
            cache: null,
            catalog: null,
            config: { ...local.config, repos: [] },
          });
        }
        const connected = await getLocalState();
        if (cancelled) return;
        hydrateLocal(connected);
        bootFail(next);
        void loadCatalog();
        if (connected.config.repos.length > 0) void runRefresh();
      } catch (err) {
        if (cancelled) return;
        bootFail(bootErrorStatus(err));
        if (pathRef.current !== "/settings")
          navigate("/setup", { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    bootAttempt,
    setPreferences,
    hydrateLocal,
    setConnecting,
    bootFail,
    loadCatalog,
    navigate,
    runRefresh,
  ]);
}
