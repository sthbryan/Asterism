import { useMemo, useReducer } from "react";
import type { PullFilters } from "../utils";

type ControlsState = PullFilters & { page: number };

type ControlsAction =
  | { type: "set"; field: keyof PullFilters; value: string }
  | { type: "clear" }
  | { type: "page"; value: number };

const initialState: ControlsState = {
  query: "",
  repo: "all",
  author: "all",
  assignee: "all",
  reviewer: "all",
  state: "all",
  page: 1,
};

function controlsReducer(
  state: ControlsState,
  action: ControlsAction,
): ControlsState {
  switch (action.type) {
    case "set":
      return { ...state, [action.field]: action.value, page: 1 };
    case "clear":
      return initialState;
    case "page":
      return { ...state, page: action.value };
  }
}

export function usePullControls() {
  const [state, dispatch] = useReducer(controlsReducer, initialState);
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
    setPage: (value: number) => dispatch({ type: "page", value }),
  };
}
