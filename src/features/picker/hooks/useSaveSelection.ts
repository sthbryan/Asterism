import { useReducer } from "react";

type SaveState = {
  saving: boolean;
  saveError: string | null;
};

type SaveAction =
  | { type: "saveStart" }
  | { type: "saveFailure"; error: string }
  | { type: "saveEnd" };

function saveReducer(state: SaveState, action: SaveAction): SaveState {
  switch (action.type) {
    case "saveStart":
      return { saving: true, saveError: null };
    case "saveFailure":
      return { ...state, saveError: action.error };
    case "saveEnd":
      return { ...state, saving: false };
  }
}

/**
 * Guarded persist for the picker selection.
 * Busy/error live in one reducer so a stale response can never leave the
 * trailing actions stuck in a saving state.
 */
export function useSaveSelection({
  persistSelection,
  onSaved,
}: {
  persistSelection: (repos: string[]) => Promise<void>;
  onSaved: () => void;
}) {
  const [state, dispatch] = useReducer(saveReducer, {
    saving: false,
    saveError: null,
  });

  async function save(repos: string[]) {
    dispatch({ type: "saveStart" });
    try {
      await persistSelection(repos);
      onSaved();
    } catch (err) {
      dispatch({ type: "saveFailure", error: String(err) });
    } finally {
      dispatch({ type: "saveEnd" });
    }
  }

  return { saving: state.saving, saveError: state.saveError, save };
}
