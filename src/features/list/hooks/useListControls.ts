import { useReducer } from "react";

export type ListSortKey = "fullName" | "stars" | "forks" | "downloads";
export type ListSort = { key: ListSortKey; dir: number };

type ControlsState = {
  query: string;
  sort: ListSort;
};

type ControlsAction =
  | { type: "setQuery"; query: string }
  | { type: "toggleSort"; key: ListSortKey };

const initialControls: ControlsState = {
  query: "",
  sort: { key: "downloads", dir: -1 },
};

let remembered = initialControls;

function controlsReducer(
  state: ControlsState,
  action: ControlsAction,
): ControlsState {
  let next = state;
  switch (action.type) {
    case "setQuery":
      next = { ...state, query: action.query };
      break;
    case "toggleSort":
      next =
        state.sort.key === action.key
          ? { ...state, sort: { key: action.key, dir: -state.sort.dir } }
          : {
              ...state,
              sort: {
                key: action.key,
                dir: action.key === "fullName" ? 1 : -1,
              },
            };
      break;
  }
  remembered = next;
  return next;
}

/**
 * Filter query and table sort for the overview list.
 * One reducer so query/sort transitions stay in a single state object
 * instead of scattered useStates in the view.
 */
export function useListControls() {
  const [state, dispatch] = useReducer(controlsReducer, remembered);

  return {
    query: state.query,
    sort: state.sort,
    setQuery: (query: string) => dispatch({ type: "setQuery", query }),
    toggleSort: (key: ListSortKey) => dispatch({ type: "toggleSort", key }),
  };
}
