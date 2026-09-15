import type { CatalogRepo } from "@/lib/types";

export interface OwnerEntry {
  name: string;
  count: number;
}

export interface PickerGroup {
  owner: string;
  repos: CatalogRepo[];
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

export function groupRepos(
  sorted: CatalogRepo[],
  owners: OwnerEntry[],
  ownerFilter: string | null,
): PickerGroup[] | null {
  if (ownerFilter || owners.length < 2) return null;
  const order = owners.map((o) => o.name);
  const buckets = new Map<string, CatalogRepo[]>();
  for (const repo of sorted) {
    const list = buckets.get(repo.owner);
    if (list) list.push(repo);
    else buckets.set(repo.owner, [repo]);
  }
  const result: PickerGroup[] = [];
  for (const name of order) {
    const repos = buckets.get(name);
    if (repos && repos.length > 0) result.push({ owner: name, repos });
  }
  for (const [name, repos] of buckets) {
    if (!order.includes(name)) result.push({ owner: name, repos });
  }
  return result;
}
