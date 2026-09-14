import { useMemo, useState } from "react";
import type { CatalogRepo } from "../../lib/types";
import type { OwnerEntry } from "./OwnerFilter";

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
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelected));
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null);

  const initial = useMemo(() => new Set(initialSelected), [initialSelected]);
  const dirty =
    selected.size !== initial.size || [...selected].some((name) => !initial.has(name));

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
    dirty,
  };
}
