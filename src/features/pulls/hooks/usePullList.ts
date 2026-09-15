import { useCallback, useEffect, useReducer, useRef } from "react";
import type { PullListResult } from "@/lib/types";
import { getCachedPullRequests, refreshPullRequests } from "@/services/api";

type ListState = {
  result: PullListResult | null;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
};

type ListAction =
  | { type: "reset" }
  | { type: "start"; refreshing: boolean }
  | { type: "success"; result: PullListResult }
  | { type: "failure"; error: string; hasData: boolean };

const initialState: ListState = {
  result: null,
  loading: true,
  refreshing: false,
  error: null,
};

function listReducer(state: ListState, action: ListAction): ListState {
  switch (action.type) {
    case "reset":
      return initialState;
    case "start":
      return {
        ...state,
        loading: !action.refreshing && !state.result,
        refreshing: action.refreshing || Boolean(state.result),
        error: null,
      };
    case "success":
      return {
        result: action.result,
        loading: false,
        refreshing: false,
        error: null,
      };
    case "failure":
      return {
        ...state,
        loading: false,
        refreshing: false,
        error: action.hasData ? null : action.error,
      };
  }
}

const memoryCache = new Map<string, PullListResult>();

function cacheKey(account: string | null, repos: string[]) {
  return `${account ?? "anonymous"}:${[...repos].sort().join(",")}`;
}

function scopedResult(result: PullListResult, repos: string[]) {
  const selected = new Set(repos);
  return {
    ...result,
    pulls: result.pulls.filter((pull) => selected.has(pull.repo)),
    errors: Object.fromEntries(
      Object.entries(result.errors).filter(
        ([repo]) => repo === "__account" || selected.has(repo),
      ),
    ),
  };
}

export function usePullList({
  account,
  repos,
  offline,
  revision,
}: {
  account: string | null;
  repos: string[];
  offline: boolean;
  revision: number;
}) {
  const [state, dispatch] = useReducer(listReducer, initialState);
  const requestRef = useRef(0);
  const key = `${revision}:${cacheKey(account, repos)}`;

  const load = useCallback(
    async (force = false) => {
      const request = ++requestRef.current;
      const cached = memoryCache.get(key);
      if (cached && !force) dispatch({ type: "success", result: cached });
      dispatch({ type: "start", refreshing: Boolean(cached) || force });

      let hasData = Boolean(cached);
      const alive = () => request === requestRef.current;
      const apply = (result: PullListResult) => {
        if (!alive()) return;
        const scoped = scopedResult(result, repos);
        memoryCache.set(key, scoped);
        hasData = true;
        dispatch({ type: "success", result: scoped });
      };

      if (!cached && !force) {
        try {
          const saved = await getCachedPullRequests();
          if (saved) apply(saved.data);
        } catch {}
      }
      if (!alive()) return;
      if (offline) {
        if (!hasData) {
          dispatch({
            type: "failure",
            error: "No cached pull requests are available.",
            hasData: false,
          });
        }
        return;
      }
      try {
        const saved = await refreshPullRequests({ repos });
        apply(saved.data);
      } catch (reason) {
        if (alive())
          dispatch({ type: "failure", error: String(reason), hasData });
      }
    },
    [key, offline, repos],
  );

  useEffect(() => {
    dispatch({ type: "reset" });
    void load();
    return () => {
      requestRef.current += 1;
    };
  }, [load]);

  return {
    ...state,
    pulls: state.result?.pulls ?? [],
    errors: state.result?.errors ?? {},
    fetchedAt: state.result?.fetchedAt ?? null,
    refresh: () => load(true),
  };
}

export function clearPullListCache() {
  memoryCache.clear();
}

export function invalidatePullListCache(account: string | null) {
  for (const key of memoryCache.keys()) {
    if (key.startsWith(`${account ?? "anonymous"}:`)) memoryCache.delete(key);
  }
}
