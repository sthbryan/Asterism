import type { CatalogRepo } from "@/lib/types";

export interface OwnerEntry {
  name: string;
  count: number;
}

export type PickerSort = "selected" | "name" | "stars";

export function buildOwners(
  catalog: CatalogRepo[],
  login: string | null,
): OwnerEntry[] {
  const map = new Map<string, number>();
  for (const repo of catalog) {
    map.set(repo.owner, (map.get(repo.owner) ?? 0) + 1);
  }
  const names = [...map.keys()].sort((a, b) => {
    if (login && a === login) return -1;
    if (login && b === login) return 1;
    return a.localeCompare(b);
  });
  return names.map((name) => ({ name, count: map.get(name) ?? 0 }));
}

export function filterRepos(
  catalog: CatalogRepo[],
  ownerFilter: string | null,
  query: string,
): CatalogRepo[] {
  const q = query.trim().toLowerCase();
  return catalog.filter((repo) => {
    if (ownerFilter && repo.owner !== ownerFilter) return false;
    if (!q) return true;
    return (
      repo.fullName.toLowerCase().includes(q) ||
      (repo.description ?? "").toLowerCase().includes(q) ||
      (repo.language ?? "").toLowerCase().includes(q)
    );
  });
}

export function sortRepos(
  filtered: CatalogRepo[],
  selected: Set<string>,
  sort: PickerSort,
): CatalogRepo[] {
  const arr = [...filtered];
  switch (sort) {
    case "name":
      arr.sort((a, b) => a.fullName.localeCompare(b.fullName));
      break;
    case "stars":
      arr.sort(
        (a, b) => b.stars - a.stars || a.fullName.localeCompare(b.fullName),
      );
      break;
    default:
      arr.sort((a, b) => {
        const sa = selected.has(a.fullName) ? 0 : 1;
        const sb = selected.has(b.fullName) ? 0 : 1;
        return sa - sb || a.fullName.localeCompare(b.fullName);
      });
      break;
  }
  return arr;
}

export function applySelection(
  selected: Set<string>,
  names: readonly string[],
  value: boolean,
): Set<string> {
  const next = new Set(selected);
  for (const name of names) {
    if (value) next.add(name);
    else next.delete(name);
  }
  return next;
}

/** Pending edits against the saved selection, counted for the save bar. */
export function selectionChanges(
  saved: ReadonlySet<string>,
  selected: ReadonlySet<string>,
): { added: number; removed: number } {
  let added = 0;
  let removed = 0;
  for (const name of selected) if (!saved.has(name)) added += 1;
  for (const name of saved) if (!selected.has(name)) removed += 1;
  return { added, removed };
}
