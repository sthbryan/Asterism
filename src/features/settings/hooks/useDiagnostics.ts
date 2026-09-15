import { useEffect, useReducer } from "react";
import type { Diagnostics } from "@/lib/types";
import { getDiagnostics } from "@/services/api";

type DiagnosticsState = {
  diagnostics: Diagnostics | null;
  error: string | null;
  loading: boolean;
  attempt: number;
};

type DiagnosticsAction =
  | { type: "loadStart" }
  | { type: "loadSuccess"; value: Diagnostics }
  | { type: "loadFailure"; error: string }
  | { type: "loadEnd" }
  | { type: "retry" };

const initialDiagnostics: DiagnosticsState = {
  diagnostics: null,
  error: null,
  loading: true,
  attempt: 0,
};

function diagnosticsReducer(
  state: DiagnosticsState,
  action: DiagnosticsAction,
): DiagnosticsState {
  switch (action.type) {
    case "loadStart":
      return { ...state, loading: true, error: null };
    case "loadSuccess":
      return { ...state, diagnostics: action.value };
    case "loadFailure":
      return { ...state, error: action.error };
    case "loadEnd":
      return { ...state, loading: false };
    case "retry":
      return { ...state, attempt: state.attempt + 1 };
  }
}

/**
 * Environment diagnostics fetch with a retry signal.
 * Loading/error/diagnostics share one reducer; attempt only retriggers
 * the effect below.
 */
export function useDiagnostics() {
  const [state, dispatch] = useReducer(diagnosticsReducer, initialDiagnostics);
  const { diagnostics, error, loading, attempt } = state;

  // biome-ignore lint/correctness/useExhaustiveDependencies: attempt is an intentional refetch signal for retry; it is not read inside the effect.
  useEffect(() => {
    let active = true;
    dispatch({ type: "loadStart" });
    getDiagnostics()
      .then((value) => {
        if (active) dispatch({ type: "loadSuccess", value });
      })
      .catch((err) => {
        if (active) dispatch({ type: "loadFailure", error: String(err) });
      })
      .finally(() => {
        if (active) dispatch({ type: "loadEnd" });
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  return {
    diagnostics,
    error,
    loading,
    retry: () => dispatch({ type: "retry" }),
  };
}
