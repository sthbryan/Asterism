import { useEffect, useMemo, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Button } from "../components/Button";
import { Chrome } from "../components/Chrome";
import { PickerSkeleton } from "../components/Skeleton";
import { Toggle } from "../components/Toggle";
import { fmtNum } from "../lib/format";
import type { CatalogRepo } from "../lib/types";

export function PickerView({
  login,
  catalog,
  loading,
  error,
  initialSelected,
  onCancel,
  onSave,
}: {
  login: string | null;
  catalog: CatalogRepo[];
  loading: boolean;
  error: string | null;
  initialSelected: string[];
  onCancel: () => void;
  onSave: (repos: string[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialSelected));
  const [ownerFilter, setOwnerFilter] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const owners = useMemo(() => {
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

  function toggle(fullName: string, next: boolean) {
    setSelected((prev) => {
      const copy = new Set(prev);
      if (next) copy.add(fullName);
      else copy.delete(fullName);
      return copy;
    });
  }

  return (
    <Chrome
      login={login}
      nav="repos"
      onNav={(id) => {
        if (id === "overview") onCancel();
      }}
      title="Select repositories"
      trailing={
        <>
          <span className="mr-1 text-[12px] text-mist">{selected.size} selected</span>
          <Button variant="quiet" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant="primary" onClick={() => onSave([...selected])} disabled={loading}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex h-full min-h-0 flex-col px-6 pb-6">
        <div className="card flex h-8 items-center gap-2 px-3">
          <MagnifyingGlass size={16} className="shrink-0 text-mist" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter repositories"
            className="h-full w-full bg-transparent text-[13px] leading-none text-paper outline-none placeholder:text-mist"
          />
        </div>
        <div className="mt-3 flex min-h-0 gap-1.5 overflow-x-auto pb-1">
          <OwnerChip
            label="All"
            count={catalog.length}
            active={ownerFilter === null}
            onClick={() => setOwnerFilter(null)}
          />
          {owners.map((owner) => (
            <OwnerChip
              key={owner.name}
              label={owner.name}
              count={owner.count}
              active={ownerFilter === owner.name}
              onClick={() => setOwnerFilter(owner.name)}
            />
          ))}
        </div>
        <div className="card mt-3 min-h-0 flex-1 overflow-auto">
          {error ? (
            <div className="px-6 py-8 text-[14px] text-accent-soft">{error}</div>
          ) : loading ? (
            <PickerSkeleton />
          ) : filtered.length === 0 ? (
            <div className="px-6 py-8 text-[14px] text-mist">No repositories match that filter.</div>
          ) : (
            <ul>
              {filtered.map((repo) => {
                const on = selected.has(repo.fullName);
                return (
                  <li key={repo.fullName} className="border-b border-line last:border-b-0">
                    <div className="flex items-center gap-4 px-4 py-3 hover:bg-white/[0.03]">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[14px] font-medium tracking-[-0.02em]">
                          {repo.fullName}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 text-[12px] text-mist">
                          {repo.language ? <span>{repo.language}</span> : null}
                          {repo.private ? <span>Private</span> : null}
                          {repo.fork ? <span>Fork</span> : null}
                          {repo.archived ? <span>Archived</span> : null}
                          <span className="tabular">{fmtNum(repo.stars)} stars</span>
                        </div>
                      </div>
                      <Toggle
                        on={on}
                        onChange={(next) => toggle(repo.fullName, next)}
                        label={`Track ${repo.fullName}`}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </Chrome>
  );
}

function OwnerChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-8 shrink-0 items-center rounded-md px-3 text-[13px] leading-none font-medium ${
        active ? "bg-accent text-white" : "bg-panel text-mist hover:text-paper"
      }`}
    >
      {label}
      <span className="ml-1.5 tabular opacity-70">{count}</span>
    </button>
  );
}
