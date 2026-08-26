import { useEffect, useMemo, useState } from "react";
import { Check, MagnifyingGlass, Star } from "@phosphor-icons/react";
import { Button } from "../components/Button";
import { Chrome } from "../components/Chrome";
import { PickerSkeleton } from "../components/Skeleton";
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

  const initial = useMemo(() => new Set(initialSelected), [initialSelected]);
  const dirty =
    selected.size !== initial.size || [...selected].some((name) => !initial.has(name));

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

  function toggle(fullName: string) {
    setSelected((prev) => {
      const copy = new Set(prev);
      if (copy.has(fullName)) copy.delete(fullName);
      else copy.add(fullName);
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
      trackedCount={selected.size}
      title={<h1 className="text-[15px] font-semibold tracking-[-0.01em]">Select repositories</h1>}
      trailing={
        <>
          <Button variant="quiet" onClick={onCancel}>
            Cancel
          </Button>
          {dirty ? (
            <Button variant="primary" onClick={() => onSave([...selected])} disabled={loading}>
              Save changes
            </Button>
          ) : null}
        </>
      }
    >
      <div className="flex h-full min-h-0 flex-col px-6 pt-5 pb-5">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex h-8 min-w-[200px] flex-1 items-center gap-2 rounded-md border border-hairline bg-white/[0.02] px-2.5 transition-colors focus-within:border-line">
            <MagnifyingGlass size={13} className="shrink-0 text-faint" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by name or language…"
              aria-label="Search repositories"
              className="h-full w-full bg-transparent text-[12.5px] leading-none outline-none placeholder:text-faint"
            />
          </label>
          <div className="inline-flex gap-0.5 rounded-lg border border-hairline bg-white/[0.02] p-[3px]">
            <SegTab label="All" count={catalog.length} active={ownerFilter === null} onClick={() => setOwnerFilter(null)} />
            {owners.map((owner) => (
              <SegTab
                key={owner.name}
                label={owner.name}
                count={owner.count}
                active={ownerFilter === owner.name}
                onClick={() => setOwnerFilter(owner.name)}
              />
            ))}
          </div>
        </div>

        <div className="card mt-3 min-h-0 flex-1 overflow-auto">
          {error ? (
            <div className="px-5 py-6 text-[13px] text-accent-soft">{error}</div>
          ) : loading ? (
            <PickerSkeleton />
          ) : filtered.length === 0 ? (
            <p className="px-5 py-6 text-center text-[12.5px] text-faint">
              No repositories match that filter.
            </p>
          ) : (
            <ul>
              {filtered.map((repo) => {
                const on = selected.has(repo.fullName);
                const sub =
                  repo.description ||
                  [repo.language, repo.fork ? "Fork" : null].filter(Boolean).join(" · ") ||
                  null;
                return (
                  <li key={repo.fullName} className="border-b border-hairline last:border-b-0">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={on}
                      onClick={() => toggle(repo.fullName)}
                      onKeyDown={(e) => {
                        if (e.key === " " || e.key === "Enter") {
                          e.preventDefault();
                          toggle(repo.fullName);
                        }
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                        on ? "bg-accent/[0.07] hover:bg-accent/[0.1]" : "hover:bg-white/[0.03]"
                      }`}
                    >
                      <span
                        className={`grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border transition-colors ${
                          on ? "border-accent bg-accent" : "border-line"
                        }`}
                      >
                        {on ? (
                          <Check size={10} weight="bold" className="text-white" />
                        ) : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-mono text-[12.5px] font-medium">
                          {repo.fullName}
                        </span>
                        {sub ? (
                          <span className="mt-0.5 block truncate text-[11.5px] text-faint">
                            {sub}
                          </span>
                        ) : null}
                      </span>
                      <span className="flex shrink-0 items-center gap-3 font-mono text-[11.5px] text-mist">
                        {repo.private ? <Meta>Private</Meta> : null}
                        {repo.archived ? <Meta>Archived</Meta> : null}
                        <span className="tabular">
                          <Star size={10} className="mr-1 inline-block -translate-y-px text-faint" />
                          {fmtNum(repo.stars)}
                        </span>
                      </span>
                    </button>
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

function SegTab({
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
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[12px] leading-none font-medium transition-colors ${
        active
          ? "bg-overlay text-paper shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
          : "text-mist hover:text-paper"
      }`}
    >
      {label}
      <span className="font-mono text-[10.5px] text-faint tabular">{count}</span>
    </button>
  );
}

function Meta({ children }: { children: string }) {
  return (
    <span className="rounded-md border border-line px-1.5 py-px font-mono text-[10px] tracking-wide uppercase">
      {children}
    </span>
  );
}
