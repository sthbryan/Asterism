import {
  CaretDownIcon,
  CaretRightIcon,
  MagnifyingGlassIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { Badge, EmptyState } from "@zovaris/sephiro";
import { Else, If, Then, When } from "react-if";
import { VList } from "virtua";
import { useI18n } from "@/app/hooks";
import { useListMemory } from "@/app/useScrollMemory";
import { SearchField } from "@/components/SearchField";
import { fmtNum, fmtSigned } from "@/lib/format";
import { langColor } from "@/lib/langcolors";
import type { TrackedRepo } from "@/lib/types";
import type { ListSort, ListSortKey } from "../hooks/useListControls";

const COLS = "grid-cols-[minmax(0,1fr)_62px_54px_78px_16px]";

type Props = {
  rows: TrackedRepo[];
  query: string;
  sort: ListSort;
  onQueryChange: (query: string) => void;
  onSort: (key: ListSortKey) => void;
  onOpenRepo: (fullName: string) => void;
};

export function RepositoryTable({
  rows,
  query,
  sort,
  onQueryChange,
  onSort,
  onOpenRepo,
}: Props) {
  const { t } = useI18n();
  const list = useListMemory("overview-list");
  const sortHead = (label: string, key: ListSortKey) => {
    const active = sort.key === key;
    return (
      <button
        type="button"
        onClick={() => onSort(key)}
        className={`inline-flex cursor-pointer items-center gap-0.5 text-[11px] font-medium whitespace-nowrap transition-colors ${active ? "text-accent-soft" : "text-faint hover:text-mist"}`}
      >
        {label}
        <CaretDownIcon
          size={10}
          className={`${active && sort.dir === 1 ? "rotate-180 " : ""}transition-opacity ${active ? "opacity-100" : "opacity-0"}`}
        />
      </button>
    );
  };

  const renderRow = (repo: TrackedRepo) => (
    <button
      type="button"
      onClick={() => onOpenRepo(repo.fullName)}
      className={`group grid w-full ${COLS} items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-hover`}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full"
          style={{ background: langColor(repo.language) }}
        />
        <span className="truncate text-[12.5px]">
          <span className="text-faint">{repo.fullName.split("/")[0]}/</span>
          <span className="font-medium">
            {repo.fullName.split("/")[1] ?? repo.fullName}
          </span>
        </span>
        <When condition={Boolean(repo.error)}>
          <span
            title={`${repo.error}${repo.fetchedAt ? ` · ${new Date(repo.fetchedAt * 1000).toLocaleString()}` : ""}`}
          >
            <WarningCircleIcon
              size={13}
              aria-label={t("errors.request")}
              className="shrink-0 text-accent-soft"
            />
          </span>
        </When>
        <When condition={repo.private}>
          <Badge
            size="sm"
            variant="neutral"
            className="shrink-0 rounded border border-line px-1 py-px leading-none font-mono text-[9px] tracking-wide uppercase"
          >
            {t("Private")}
          </Badge>
        </When>
      </span>
      {[
        {
          id: "stars",
          value: repo.stars,
          strong: false,
          change: repo.starsDelta,
        },
        {
          id: "forks",
          value: repo.forks,
          strong: false,
          change: repo.forksDelta,
        },
        {
          id: "downloads",
          value: repo.downloads,
          strong: true,
          change: repo.downloadsDelta,
        },
      ].map(({ id, value, strong, change }) => (
        <span key={id} className="text-right">
          <span
            className={`block text-[12.5px] tabular ${value > 0 ? (strong ? "font-medium" : "") : "text-faint"}`}
          >
            {fmtNum(value)}
          </span>
          <When condition={change != null && change !== 0}>
            <span
              className={`block font-mono text-[10px] leading-tight tabular ${change != null && change > 0 ? "text-ok" : "text-accent-soft"}`}
            >
              {fmtSigned(change ?? 0)}
            </span>
          </When>
        </span>
      ))}
      <CaretRightIcon
        size={12}
        className="justify-self-end text-faint opacity-0 transition-opacity group-hover:opacity-100"
      />
    </button>
  );

  return (
    <div className="app-card flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
      <div className="flex shrink-0 items-center gap-3 px-4 pt-3 pb-1">
        <span className="text-[13px] font-semibold">{t("Repositories")}</span>
        <SearchField
          id="repository-filter"
          className="ml-auto w-42.5"
          value={query}
          onChange={onQueryChange}
          placeholder={t("Filter…")}
          ariaLabel={t("Filter repositories")}
        />
      </div>
      <div
        className={`grid shrink-0 ${COLS} items-center gap-3 border-b border-hairline px-4 py-2 text-[11px] font-medium text-faint`}
      >
        {sortHead(t("Repository"), "fullName")}
        <div className="flex justify-end">{sortHead(t("Stars"), "stars")}</div>
        <div className="flex justify-end">{sortHead(t("Forks"), "forks")}</div>
        <div className="flex justify-end">
          {sortHead(t("Downloads"), "downloads")}
        </div>
        <span />
      </div>
      <If condition={rows.length === 0}>
        <Then>
          <EmptyState
            compact
            icon={<MagnifyingGlassIcon />}
            title={t("list.noResults", { query: query.trim() })}
            className="px-4 py-5"
          />
        </Then>
        <Else>
          {/* The table is its own window: only rows in view are mounted. */}
          <div className="min-h-0 flex-1">
            <VList
              key={`${query}:${sort.key}:${sort.dir}`}
              ref={list.ref}
              onScroll={list.onScroll}
              style={{ height: "100%" }}
              aria-label={t("Repositories")}
            >
              {rows.map((repo) => (
                <div key={repo.fullName} className="border-b border-hairline">
                  {renderRow(repo)}
                </div>
              ))}
            </VList>
          </div>
        </Else>
      </If>
    </div>
  );
}
