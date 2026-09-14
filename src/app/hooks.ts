import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { getCache, getConfig, getStatus, isMockMode } from "../lib/api";
import {
  applyDocumentLocale,
  detectLocale,
  readStoredLocale,
} from "../lib/i18n/locale";
import type { Status } from "../lib/types";
import { useStore } from "./store";

export function detailPath(fullName: string): string {
  return `/repo/${encodeURIComponent(fullName)}`;
}

export function decodeDetailParam(param: string | undefined): string {
  try {
    return decodeURIComponent(param ?? "");
  } catch {
    return param ?? "";
  }
}

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
  const { state, dispatch, runRefresh, loadCatalog } = useStore();
  const [path, navigate] = useLocation();
  const pathRef = useRef(path);
  pathRef.current = path;
  const bootAttempt = state.bootAttempt;

  // biome-ignore lint/correctness/useExhaustiveDependencies: bootAttempt is an intentional re-run signal for boot retry; it is read via bootAttempt dep, not inside the effect.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await getConfig();
        if (cancelled) return;
        applyDocumentLocale(cfg.locale ?? readStoredLocale() ?? detectLocale());
        dispatch({ type: "preferences", config: cfg });
        const next = await getStatus();
        if (cancelled) return;
        if (!next.ok) {
          dispatch({ type: "bootFail", status: next });
          if (pathRef.current !== "/settings")
            navigate("/setup", { replace: true });
          return;
        }
        const cache = await getCache();
        if (cancelled) return;
        dispatch({ type: "bootOk", status: next, config: cfg, cache });
        navigate(resolveInitialRoute(pathRef.current), { replace: true });
        void loadCatalog();
        if (cfg.repos.length > 0) {
          void runRefresh();
        }
      } catch (err) {
        if (cancelled) return;
        dispatch({ type: "bootFail", status: bootErrorStatus(err) });
        navigate("/setup", { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bootAttempt, dispatch, loadCatalog, navigate, runRefresh]);
}

/** Ensure the repo catalog is loaded (picker entry point). */
export function useCatalog() {
  const { state, loadCatalog } = useStore();
  useEffect(() => {
    if (
      state.catalog.length === 0 &&
      !state.catalogLoading &&
      !state.catalogError
    ) {
      void loadCatalog();
    }
  }, [
    state.catalog.length,
    state.catalogLoading,
    state.catalogError,
    loadCatalog,
  ]);
}

/** Load repo detail for fullName and merge star/download history into the store. */
export function useDetail(fullName: string) {
  const { state, dispatch, fetchDetail } = useStore();
  useEffect(() => {
    if (!fullName) return;
    void fetchDetail(fullName);
  }, [fullName, fetchDetail]);
  useEffect(() => {
    return () => {
      dispatch({ type: "detailClear" });
    };
  }, [dispatch]);
  return {
    detail: state.detail,
    loading: state.detailLoading,
    error: state.detailError,
  };
}
