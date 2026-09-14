import { useCallback, useEffect } from "react";
import { useCatalog, useI18n } from "../../app/hooks";
import { useStore } from "../../app/store";
import { useTransitionNavigate } from "../../app/useViewTransition";
import { PageHeader } from "../../components/PageHeader";
import { PickerSkeleton } from "../../components/Skeleton";
import { OwnerFilter } from "./OwnerFilter";
import { PickerTrailing } from "./PickerTrailing";
import { RepoRow } from "./RepoRow";
import { SearchBar } from "./SearchBar";
import { SortControl } from "./SortControl";
import { usePicker } from "./usePicker";

export function PickerView() {
  const { t } = useI18n();
  const navigate = useTransitionNavigate();

  useCatalog();

  const login = useStore((s) => s.status?.login ?? null);
  const catalog = useStore((s) => s.catalog);
  const loading = useStore((s) => s.catalogLoading && s.catalog.length === 0);
  const error = useStore((s) => s.catalogError);
  const initialSelected = useStore((s) => s.selectedNames);
  const persistSelection = useStore((s) => s.persistSelection);

  const onCancel = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const onSave = useCallback(
    (repos: string[]) => {
      void persistSelection(repos);
      navigate("/");
    },
    [navigate, persistSelection],
  );

  const {
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
  } = usePicker({ login, catalog, initialSelected });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <>
      <PageHeader
        title={
          <h1 className="text-[15px] font-semibold tracking-[-0.01em]">
            {t("Select repositories")}
          </h1>
        }
        trailing={
          <PickerTrailing
            dirty={dirty}
            loading={loading}
            onCancel={onCancel}
            onSave={() => onSave([...selected])}
          />
        }
      />
      <div className="flex h-full min-h-0 flex-col px-6 pt-5 pb-5">
        <div className="flex flex-wrap items-center gap-3">
          <SearchBar value={query} onChange={setQuery} />
          <SortControl value={sort} onChange={setSort} />
          <OwnerFilter
            total={catalog.length}
            owners={owners}
            active={ownerFilter}
            onChange={setOwnerFilter}
          />
        </div>

        <div className="card mt-3 min-h-0 flex-1 overflow-auto">
          {error ? (
            <div
              role="alert"
              className="px-5 py-6 text-[13px] text-accent-soft"
            >
              <p>{t("errors.request")}</p>
              <p className="mt-1 break-words">{error}</p>
            </div>
          ) : loading ? (
            <PickerSkeleton />
          ) : filtered.length === 0 ? (
            <p className="px-5 py-6 text-center text-[12.5px] text-faint">
              {t("No repositories match that filter.")}
            </p>
          ) : groups ? (
            <ul>
              {groups.map((group) => (
                <li key={group.owner}>
                  <div className="sticky top-0 flex items-center gap-2 border-b border-hairline bg-wash px-4 py-1.5 text-[11px] font-semibold tracking-wide text-mist uppercase">
                    {group.owner}
                    <span className="font-mono text-[10.5px] font-normal text-faint tabular">
                      {group.repos.length}
                    </span>
                  </div>
                  <ul>
                    {group.repos.map((repo) => (
                      <RepoRow
                        key={repo.fullName}
                        repo={repo}
                        selected={selected.has(repo.fullName)}
                        onToggle={toggle}
                      />
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          ) : (
            <ul>
              {sorted.map((repo) => (
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
    </>
  );
}
