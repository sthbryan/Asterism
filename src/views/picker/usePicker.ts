import { useMemo, useState } from "react";
import type { CatalogRepo } from "../../lib/types";
import type { OwnerEntry } from "./OwnerFilter";

export type PickerSort = "selected" | "name" | "stars";

export interface PickerGroup {
  owner: string;
  repos: CatalogRepo[];
}

export function usePicker({
  login,
  catalog,
  initialSelected,
}: {
  login: string | null;
  catalog: CatalogRepo[];
  initialSelected: string[];
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelected),
  );
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<PickerSort>("selected");

  const initial = useMemo(() => new Set(initialSelected), [initialSelected]);
  const dirty =
    selected.size !== initial.size ||
    [...selected].some((name) => !initial.has(name));

  const owners: OwnerEntry[] = useMemo(() => {
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
  }, [catalog, login]);

  const filtered = useMemo(() => {
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
  }, [catalog, ownerFilter, query]);

  const sorted = useMemo(() => {
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
      case "selected":
      default:
        arr.sort((a, b) => {
          const sa = selected.has(a.fullName) ? 0 : 1;
          const sb = selected.has(b.fullName) ? 0 : 1;
          return sa - sb || a.fullName.localeCompare(b.fullName);
        });
        break;
    }
    return arr;
  }, [filtered, selected, sort]);

  const groups: PickerGroup[] | null = useMemo(() => {
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
  }, [ownerFilter, owners, sorted]);

  function toggle(fullName: string) {
    setSelected((prev) => {
      const copy = new Set(prev);
      if (copy.has(fullName)) copy.delete(fullName);
      else copy.add(fullName);
      return copy;
    });
  }

  return {
    query,
    setQuery,
    selected,
    toggle,
    ownerFilter,
    setOwnerFilter,
    owners,
    filtered,
    sorted,
    groups,
    sort,
    setSort,
    dirty,
  };
}
