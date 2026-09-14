import { useEffect, useRef } from "react";
import { PickerSkeleton } from "../components/Skeleton";
import type { CatalogRepo } from "../lib/types";
import { OwnerFilter } from "./picker/OwnerFilter";
import { PickerTrailing } from "./picker/PickerTrailing";
import { RepoRow } from "./picker/RepoRow";
import { SearchBar } from "./picker/SearchBar";
import { usePicker } from "./picker/usePicker";

export { PickerTrailing };

export function PickerView({
  login,
  catalog,
  loading,
  error,
  initialSelected,
  onCancel,
  onSave,
  onDirtyChange,
}: {
  login: string | null;
  catalog: CatalogRepo[];
  loading: boolean;
  error: string | null;
  initialSelected: string[];
  onCancel: () => void;
  onSave: (repos: string[]) => void;
  onDirtyChange?: (dirty: boolean, save: () => void) => void;
}) {
  const {
    query,
    setQuery,
    selected,
    toggle,
    ownerFilter,
    setOwnerFilter,
    owners,
    filtered,
    dirty,
  } = usePicker({ login, catalog, initialSelected });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const onDirtyChangeRef = useRef(onDirtyChange);
  onDirtyChangeRef.current = onDirtyChange;
  useEffect(() => {
    onDirtyChangeRef.current?.(dirty, () => onSave([...selected]));
  }, [dirty, onSave, selected]);

  return (
    <div className="flex h-full min-h-0 flex-col px-6 pt-5 pb-5">
      <div className="flex flex-wrap items-center gap-3">
        <SearchBar value={query} onChange={setQuery} />
        <OwnerFilter
          total={catalog.length}
          owners={owners}
          active={ownerFilter}
          onChange={setOwnerFilter}
        />
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
            {filtered.map((repo) => (
              <RepoRow
                key={repo.fullName}
                repo={repo}
                selected={selected.has(repo.fullName)}
                onToggle={toggle}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
