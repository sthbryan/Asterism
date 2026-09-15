import { useReducer } from "react";
import { useStore } from "@/app/store";
import {
  clearLocalCache,
  importLegacyData,
  useLegacyData as viewLegacyData,
} from "@/services/api";

type LocalDataState = {
  busy: boolean;
  error: string | null;
  done: boolean;
};

type LocalDataAction =
  | { type: "runStart" }
  | { type: "runSuccess" }
  | { type: "runFailure"; error: string }
  | { type: "runEnd" };

const initialLocalData: LocalDataState = {
  busy: false,
  error: null,
  done: false,
};

function localDataReducer(
  state: LocalDataState,
  action: LocalDataAction,
): LocalDataState {
  switch (action.type) {
    case "runStart":
      return { busy: true, error: null, done: false };
    case "runSuccess":
      return { ...state, done: true };
    case "runFailure":
      return { ...state, error: action.error };
    case "runEnd":
      return { ...state, busy: false };
  }
}

/**
 * Guarded local-data actions (clear / import / view legacy).
 * Every action shares the same busy/error/done handling so concurrent
 * clicks can never interleave two operations.
 */
export function useLocalData() {
  const [state, dispatch] = useReducer(localDataReducer, initialLocalData);
  const hydrate = useStore((s) => s.hydrateLocal);
  const bootFail = useStore((s) => s.bootFail);

  async function run(action: "clear" | "import" | "legacy") {
    if (state.busy) return;
    dispatch({ type: "runStart" });
    try {
      const result = await (action === "clear"
        ? clearLocalCache()
        : action === "import"
          ? importLegacyData()
          : viewLegacyData());
      hydrate(result);
      if (action === "legacy")
        bootFail({ ok: false, login: null, error: null, hint: null });
      dispatch({ type: "runSuccess" });
    } catch (err) {
      dispatch({ type: "runFailure", error: String(err) });
    } finally {
      dispatch({ type: "runEnd" });
    }
  }

  return { busy: state.busy, error: state.error, done: state.done, run };
}
