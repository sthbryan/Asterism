import { useCallback, useEffect, useReducer, useRef } from "react";
import type { PullRequestDetail, Saved } from "@/lib/types";
import {
  getCachedPullDiff,
  getCachedPullRequest,
  getPullDiff,
  getPullRequest,
} from "@/services/api";

type DetailState = {
  saved: Saved<PullRequestDetail> | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  filesOpen: boolean;
  diffOpen: boolean;
  diff: Saved<string> | null;
  diffError: string | null;
  diffLoading: boolean;
  diffRefreshing: boolean;
};

type DetailAction =
  | { type: "reset" }
  | { type: "start"; refreshing: boolean }
  | { type: "success"; saved: Saved<PullRequestDetail> }
  | { type: "failure"; error: string; hasData: boolean }
  | { type: "toggleFiles" }
  | { type: "openDiff" }
  | { type: "closeDiff" }
  | { type: "diffStart"; refreshing: boolean }
  | { type: "diffSuccess"; saved: Saved<string> }
  | { type: "diffFailure"; error: string };

const initialState: DetailState = {
  saved: null,
  error: null,
  loading: true,
  refreshing: false,
  filesOpen: false,
  diffOpen: false,
  diff: null,
  diffError: null,
  diffLoading: false,
  diffRefreshing: false,
};

function detailReducer(state: DetailState, action: DetailAction): DetailState {
  switch (action.type) {
    case "reset":
      return initialState;
    case "start":
      return {
        ...state,
        loading: !action.refreshing && !state.saved,
        refreshing: action.refreshing || Boolean(state.saved),
        error: null,
      };
    case "success":
      return {
        ...state,
        saved: action.saved,
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
    case "toggleFiles":
      return { ...state, filesOpen: !state.filesOpen };
    case "openDiff":
      return { ...state, diffOpen: true };
    case "closeDiff":
      return { ...state, diffOpen: false };
    case "diffStart":
      return {
        ...state,
        diffLoading: !state.diff && !action.refreshing,
        diffRefreshing: action.refreshing || Boolean(state.diff),
        diffError: null,
      };
    case "diffSuccess":
      return {
        ...state,
        diff: action.saved,
        diffLoading: false,
        diffRefreshing: false,
        diffError: null,
      };
    case "diffFailure":
      return {
        ...state,
        diffLoading: false,
        diffRefreshing: false,
        diffError: action.error,
      };
  }
}

const detailCache = new Map<string, Saved<PullRequestDetail>>();
const diffCache = new Map<string, Saved<string>>();

function pullKey(account: string | null, repo: string, number: number) {
  return `${account ?? "anonymous"}:${repo}#${number}`;
}

export function usePullDetail({
  account,
  repo,
  number,
  offline,
  revision,
}: {
  account: string | null;
  repo: string;
  number: number;
  offline: boolean;
  revision: number;
}) {
  const [state, dispatch] = useReducer(detailReducer, initialState);
  const requestRef = useRef(0);
  const diffRequestRef = useRef(0);
  const key = `${revision}:${pullKey(account, repo, number)}`;

  const load = useCallback(async () => {
    const request = ++requestRef.current;
    const cached = detailCache.get(key);
    const alive = () => request === requestRef.current;
    if (cached) dispatch({ type: "success", saved: cached });
    dispatch({ type: "start", refreshing: Boolean(cached) });
    const apply = (saved: Saved<PullRequestDetail>) => {
      if (!alive()) return;
      detailCache.set(key, saved);
      dispatch({ type: "success", saved });
    };
    if (!cached) {
      try {
        const saved = await getCachedPullRequest(repo, number);
        if (saved) apply(saved);
      } catch {}
    }
    if (!alive() || offline) {
      if (offline && !detailCache.has(key))
        dispatch({
          type: "failure",
          error: "This pull request is not cached.",
          hasData: false,
        });
      return;
    }
    try {
      apply(await getPullRequest(repo, number, false));
    } catch (reason) {
      if (alive())
        dispatch({
          type: "failure",
          error: String(reason),
          hasData: Boolean(detailCache.get(key)),
        });
    }
  }, [key, number, offline, repo]);

  useEffect(() => {
    dispatch({ type: "reset" });
    void load();
    return () => {
      requestRef.current += 1;
      diffRequestRef.current += 1;
    };
  }, [load]);

  const loadDiff = useCallback(async () => {
    const diffKey = key;
    dispatch({ type: "openDiff" });
    const cached = diffCache.get(diffKey);
    const request = ++diffRequestRef.current;
    const alive = () => request === diffRequestRef.current;
    if (cached) dispatch({ type: "diffSuccess", saved: cached });
    dispatch({ type: "diffStart", refreshing: Boolean(cached) });
    const apply = (saved: Saved<string>) => {
      if (!alive()) return;
      diffCache.set(diffKey, saved);
      dispatch({ type: "diffSuccess", saved });
    };
    if (!cached) {
      try {
        const saved = await getCachedPullDiff(repo, number);
        if (saved) apply(saved);
      } catch {}
    }
    if (!alive() || offline) {
      if (offline && !diffCache.has(diffKey))
        dispatch({ type: "diffFailure", error: "This diff is not cached." });
      return;
    }
    try {
      apply(await getPullDiff(repo, number, false));
    } catch (reason) {
      if (alive() && !diffCache.has(diffKey))
        dispatch({ type: "diffFailure", error: String(reason) });
    }
  }, [key, number, offline, repo]);

  const toggleDiff = useCallback(() => {
    if (state.diffOpen) {
      dispatch({ type: "closeDiff" });
      return;
    }
    void loadDiff();
  }, [loadDiff, state.diffOpen]);

  return {
    ...state,
    pull: state.saved?.data ?? null,
    fetchedAt: state.saved?.fetchedAt ?? null,
    warning: state.saved?.warning ?? null,
    toggleDiff,
    toggleFiles: () => dispatch({ type: "toggleFiles" }),
  };
}

export function clearPullDetailCache() {
  detailCache.clear();
  diffCache.clear();
}
