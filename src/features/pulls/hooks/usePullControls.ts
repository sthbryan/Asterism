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
  state: "open",
  page: 1,
};

let remembered = initialState;

function controlsReducer(
  state: ControlsState,
  action: ControlsAction,
): ControlsState {
  let next = state;
  switch (action.type) {
    case "set":
      next = { ...state, [action.field]: action.value, page: 1 };
      break;
    case "clear":
      next = initialState;
      break;
    case "page":
      next = { ...state, page: action.value };
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
    setPage: (value: number) => dispatch({ type: "page", value }),
  };
}
