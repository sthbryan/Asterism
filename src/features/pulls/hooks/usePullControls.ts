import { useMemo, useReducer } from "react";
import type { PullFilters } from "../utils";

type ControlsState = PullFilters;

type ControlsAction =
  | { type: "set"; field: keyof PullFilters; value: string }
  | { type: "clear" };

const initialState: ControlsState = {
  query: "",
  repo: "all",
  author: "all",
  assignee: "all",
  reviewer: "all",
  state: "open",
};

let remembered = initialState;

function controlsReducer(
  state: ControlsState,
  action: ControlsAction,
): ControlsState {
  let next = state;
  switch (action.type) {
    case "set":
      next = { ...state, [action.field]: action.value };
      break;
    case "clear":
      next = initialState;
      break;
  }
  remembered = next;
  return next;
}

export function usePullControls() {
  const [state, dispatch] = useReducer(controlsReducer, remembered);
  const filters = useMemo<PullFilters>(
    () => ({
      query: state.query,
      repo: state.repo,
      author: state.author,
      assignee: state.assignee,
      reviewer: state.reviewer,
      state: state.state,
    }),
    [state],
  );

  return {
    ...state,
    filters,
    set: (field: keyof PullFilters, value: string) =>
      dispatch({ type: "set", field, value }),
    clear: () => dispatch({ type: "clear" }),
  };
}
