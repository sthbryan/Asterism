import { Button, EmptyState, Notice, Surface } from "@zovaris/sephiro";
import { useCallback, useEffect } from "react";
import { Case, Default, Switch, When } from "react-if";
import { VList } from "virtua";
import { useCatalog, useI18n } from "@/app/hooks";
import { useStore } from "@/app/store";
import { useTransitionNavigate } from "@/app/useViewTransition";
import { PageHeader } from "@/components/PageHeader";
import { PickerSkeleton } from "@/components/Skeleton";
import { usePicker } from "../hooks/usePicker";
import { useSaveSelection } from "../hooks/useSaveSelection";
import { OwnerFilter } from "./OwnerFilter";
import { PickerFooter } from "./PickerFooter";
import { RepoRow, ROW_COLS } from "./RepoRow";
import { SearchBar } from "./SearchBar";
import { SortControl } from "./SortControl";

export function PickerView() {
  const { t, locale } = useI18n();
  const navigate = useTransitionNavigate();

  useCatalog();

  const fetchedAt = useStore((s) => s.catalogFetchedAt);
  const connecting = useStore((s) => s.connecting);
  const account = useStore((s) => s.account);
  const login = useStore((s) => s.status?.login ?? null);
  const catalog = useStore((s) => s.catalog);
  const loading = useStore((s) => s.catalogLoading && s.catalog.length === 0);
  const error = useStore((s) => s.catalogError);
  const initialSelected = useStore((s) => s.selectedNames);
  const persistSelection = useStore((s) => s.persistSelection);

  const onCancel = useCallback(() => {
    navigate("/");
  }, [navigate]);
  const { saving, saveError, save } = useSaveSelection({
    persistSelection,
    onSaved: onCancel,
  });

  const {
    query,
    setQuery,
    selected,
    toggle,
    setNames,
    ownerFilter,
    setOwnerFilter,
    owners,
    filtered,
    sorted,
    sort,
    setSort,
    changes,
  } = usePicker({ login, catalog, initialSelected });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const fetchedText = fetchedAt
    ? t("list.updated", {
        value: new Intl.DateTimeFormat(locale, {
          dateStyle: "medium",
          timeStyle: "short",
        }).format(fetchedAt * 1000),
      })
    : null;

  /** Bulk actions apply to what the current filter shows. */
  const visibleNames = filtered.map((repo) => repo.fullName);

  return (
    <>
      <PageHeader
        title={
          <h1 className="text-[15px] font-semibold tracking-[-0.01em]">
            {t("Select repositories")}
          </h1>
        }
      />
      <div className="flex h-full min-h-0 flex-col px-6 pt-5 pb-5">
        <div className="flex w-full min-w-0 flex-wrap items-center gap-3">
          <SearchBar value={query} onChange={setQuery} />
          <SortControl value={sort} onChange={setSort} />
          <div className="min-w-0 max-w-full overflow-x-auto">
            <OwnerFilter
              total={catalog.length}
              owners={owners}
              active={ownerFilter}
              onChange={setOwnerFilter}
            />
          </div>
        </div>

        <When condition={Boolean(fetchedAt)}>
          <p className="mt-3 text-xs text-mist">{fetchedText}</p>
        </When>
        <When condition={Boolean(error) && catalog.length > 0}>
          <Notice variant="warning" className="mt-3">
            {t("errors.request")} {error}
          </Notice>
        </When>
        <When condition={Boolean(saveError)}>
          <Notice variant="danger" className="mt-3">
            {t("errors.request")} {saveError}
          </Notice>
        </When>
        <Surface
          padding="none"
          className="mt-3 flex min-h-0 flex-1 flex-col overflow-hidden border border-hairline"
        >
          <div className="shrink-0 border-b border-hairline bg-raised">
            <div className="flex items-center gap-3 py-1.5 pr-3 pl-4">
              <span className="text-[13px] font-semibold">
                {t("Repositories")}
              </span>
              <div className="ml-auto flex items-center gap-1">
                <span
                  className="mr-1.5 font-mono text-[11.5px] text-mist tabular"
                  aria-live="polite"
                >
                  {t("Selected count", {
                    count: selected.size,
                    total: catalog.length,
                  })}
                </span>
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => setNames(visibleNames, true)}
                >
                  {t("Select all")}
                </Button>
                <When condition={selected.size > 0}>
                  <Button
                    variant="quiet"
                    size="sm"
                    onClick={() => setNames(visibleNames, false)}
                  >
                    {t("Clear")}
                  </Button>
                </When>
              </div>
            </div>
            <div className="flex items-center gap-3 border-t border-hairline px-4 py-2 text-[11px] font-medium text-faint">
              <span className="w-3.5 shrink-0" />
              <span className={`${ROW_COLS} flex-1`}>
                <span>{t("Repository")}</span>
                <span className="justify-self-end">{t("Stars")}</span>
              </span>
            </div>
          </div>
          <Switch>
            <Case condition={Boolean(error) && catalog.length === 0}>
              <div className="min-h-0 flex-1 overflow-auto">
                <Notice variant="danger" className="m-4">
                  <p>{t("errors.request")}</p>
                  <p className="mt-1 wrap-break-word">{error}</p>
                </Notice>
              </div>
            </Case>
            <Case condition={loading}>
              <div className="min-h-0 flex-1 overflow-auto">
                <PickerSkeleton />
              </div>
            </Case>
            <Case condition={filtered.length === 0}>
              <EmptyState
                title={t("No repositories match that filter.")}
                compact
                className="min-h-0 flex-1 px-5 text-[12.5px]"
              />
            </Case>
            <Default>
              {/* Only the rows in view are mounted, so hundreds of repos stay cheap. */}
              <div className="min-h-0 flex-1">
                {" "}
                <VList
                  key={`${query}:${ownerFilter}:${sort}`}
                  style={{ height: "100%" }}
                  aria-label={t("Repositories")}
                >
                  {sorted.map((repo) => (
                    <RepoRow
                      key={repo.fullName}
                      repo={repo}
                      selected={selected.has(repo.fullName)}
                      onToggle={toggle}
                    />
                  ))}
                </VList>
              </div>
            </Default>
          </Switch>
        </Surface>
        <PickerFooter
          changes={changes}
          busy={loading || connecting || !account || saving}
          onCancel={onCancel}
          onSave={() => {
            void save([...selected]);
          }}
        />
      </div>
    </>
  );
}
