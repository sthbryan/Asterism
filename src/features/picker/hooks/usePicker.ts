import { useMemo, useReducer } from "react";
import type { CatalogRepo } from "@/lib/types";
import {
  buildOwners,
  filterRepos,
  groupRepos,
  type PickerSort,
  sortRepos,
} from "../utils/pickerData";

type PickerState = {
  query: string;
  selected: Set<string>;
  ownerFilter: string | null;
  sort: PickerSort;
};

type PickerAction =
  | { type: "setQuery"; query: string }
  | { type: "toggle"; fullName: string }
  | { type: "setOwnerFilter"; owner: string | null }
  | { type: "setSort"; sort: PickerSort };

function initPicker(initialSelected: string[]): PickerState {
  return {
    query: "",
    selected: new Set(initialSelected),
    ownerFilter: null,
    sort: "selected",
  };
}

function pickerReducer(state: PickerState, action: PickerAction): PickerState {
  switch (action.type) {
    case "setQuery":
      return { ...state, query: action.query };
    case "toggle": {
      const copy = new Set(state.selected);
      if (copy.has(action.fullName)) copy.delete(action.fullName);
      else copy.add(action.fullName);
      return { ...state, selected: copy };
    }
    case "setOwnerFilter":
      return { ...state, ownerFilter: action.owner };
    case "setSort":
      return { ...state, sort: action.sort };
  }
}

/**
 * Selection, filter and sort state for the repository picker.
 * One reducer holds the four fields so toggle/query/filter/sort act on a
 * single state object; catalog derivations stay memoized below.
 */
export function usePicker({
  login,
  catalog,
  initialSelected,
}: {
  login: string | null;
  catalog: CatalogRepo[];
  initialSelected: string[];
}) {
  const [state, dispatch] = useReducer(
    pickerReducer,
    initialSelected,
    initPicker,
  );
  const { query, selected, ownerFilter, sort } = state;

  const initial = useMemo(() => new Set(initialSelected), [initialSelected]);
  const dirty =
    selected.size !== initial.size ||
    [...selected].some((name) => !initial.has(name));

  const owners = useMemo(() => buildOwners(catalog, login), [catalog, login]);

  const filtered = useMemo(
    () => filterRepos(catalog, ownerFilter, query),
    [catalog, ownerFilter, query],
  );

  const sorted = useMemo(
    () => sortRepos(filtered, selected, sort),
    [filtered, selected, sort],
  );

  const groups = useMemo(
    () => groupRepos(sorted, owners, ownerFilter),
    [ownerFilter, owners, sorted],
  );

  return {
    query,
    setQuery: (query: string) => dispatch({ type: "setQuery", query }),
    selected,
    toggle: (fullName: string) => dispatch({ type: "toggle", fullName }),
    ownerFilter,
    setOwnerFilter: (owner: string | null) =>
      dispatch({ type: "setOwnerFilter", owner }),
    owners,
    filtered,
    sorted,
    groups,
    sort,
    setSort: (sort: PickerSort) => dispatch({ type: "setSort", sort }),
    dirty,
  };
}

export type { PickerSort };
