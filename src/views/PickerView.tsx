import { useEffect, useMemo, useState } from "react";
import { MagnifyingGlass } from "@phosphor-icons/react";
import { Button } from "../components/Button";
import { Chrome } from "../components/Chrome";
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
      trailing={
        <>
          <span className="mr-1 font-mono text-[11px] text-mist">
            {selected.size} selected
          </span>
          <Button onClick={onCancel}>Cancel</Button>
          <Button variant="primary" onClick={() => onSave([...selected])} disabled={loading}>
            Save
          </Button>
        </>
      }
    >
      <div className="flex h-full min-h-0">
        <aside className="flex w-56 shrink-0 flex-col border-r border-line">
          <button
            type="button"
            onClick={() => setOwnerFilter(null)}
            className={`flex items-center justify-between px-4 py-2.5 text-left text-[13px] ${
              ownerFilter === null ? "bg-white/[0.04] text-paper" : "text-mist hover:text-paper"
            }`}
          >
            All owners
            <span className="font-mono text-[11px]">{fmtNum(catalog.length)}</span>
          </button>
          <div className="min-h-0 flex-1 overflow-auto">
            {owners.map((owner) => (
              <button
                key={owner.name}
                type="button"
                onClick={() => setOwnerFilter(owner.name)}
                className={`flex w-full items-center justify-between px-4 py-2 text-left text-[13px] ${
                  ownerFilter === owner.name
                    ? "bg-white/[0.04] text-paper"
                    : "text-mist hover:text-paper"
                }`}
              >
                <span className="truncate">{owner.name}</span>
                <span className="font-mono text-[11px]">{fmtNum(owner.count)}</span>
              </button>
            ))}
          </div>
        </aside>
        <section className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
            <MagnifyingGlass size={14} className="text-mist" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter repositories"
              className="h-8 w-full bg-transparent text-[13px] text-paper outline-none placeholder:text-mist"
            />
          </div>
          {error ? (
            <div className="px-6 py-8 text-[14px] text-star">{error}</div>
          ) : loading ? (
            <div className="px-6 py-8 text-[14px] text-mist">Loading repositories from gh…</div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-8 text-[14px] text-mist">No repositories match that filter.</div>
          ) : (
            <ul className="min-h-0 flex-1 overflow-auto">
              {filtered.map((repo) => {
                const on = selected.has(repo.fullName);
                return (
                  <li key={repo.fullName} className="border-b border-line/70">
                    <div className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.025]">
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-medium tracking-[-0.02em]">
                          {repo.fullName}
                        </div>
                        <div className="mt-0.5 flex gap-2 text-[12px] text-mist">
                          {repo.language ? <span>{repo.language}</span> : null}
                          {repo.private ? <span>Private</span> : null}
                          {repo.fork ? <span>Fork</span> : null}
                          {repo.archived ? <span>Archived</span> : null}
                          <span className="font-mono tabular">★ {fmtNum(repo.stars)}</span>
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
        </section>
      </div>
    </Chrome>
  );
}
