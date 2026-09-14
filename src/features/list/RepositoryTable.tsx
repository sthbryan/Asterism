import {
  CaretDownIcon,
  CaretRightIcon,
  MagnifyingGlassIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { VList } from "virtua";
import { useI18n } from "@/app/hooks";
import { Input } from "@/components/Input";
import { fmtNum, fmtSigned } from "@/lib/format";
import { langColor } from "@/lib/langcolors";
import type { TrackedRepo } from "@/lib/types";

const COLS = "grid-cols-[minmax(0,1fr)_80px_80px_96px_24px]";
type SortKey = "fullName" | "stars" | "forks" | "downloads";
type SortState = { key: SortKey; dir: number };

type Props = {
  rows: TrackedRepo[];
  query: string;
  sort: SortState;
  onQueryChange: (query: string) => void;
  onSort: (key: SortKey) => void;
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
  const sortHead = (label: string, key: SortKey) => {
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
        {repo.error ? (
          <span
            title={`${repo.error}${repo.fetchedAt ? ` · ${new Date(repo.fetchedAt * 1000).toLocaleString()}` : ""}`}
          >
            <WarningCircleIcon
              size={13}
              aria-label={t("offline.partial")}
              className="shrink-0 text-accent-soft"
            />
          </span>
        ) : null}
        {repo.private ? (
          <span className="shrink-0 rounded-md border border-line px-1.5 py-px font-mono text-[10px] tracking-wide uppercase text-mist">
            {t("Private")}
          </span>
        ) : null}
      </span>
      {[
        { value: repo.stars, strong: false, change: repo.starsDelta },
        { value: repo.forks, strong: false, change: repo.forksDelta },
        { value: repo.downloads, strong: true, change: repo.downloadsDelta },
      ].map(({ value, strong, change }) => (
        <span key={value + String(change)} className="text-right">
          <span
            className={`block text-[12.5px] tabular ${value > 0 ? (strong ? "font-medium" : "") : "text-faint"}`}
          >
            {fmtNum(value)}
          </span>
          {change != null && change !== 0 ? (
            <span
              className={`block font-mono text-[10px] leading-tight tabular ${change > 0 ? "text-ok" : "text-accent-soft"}`}
            >
              {fmtSigned(change)}
            </span>
          ) : null}
        </span>
      ))}
      <CaretRightIcon
        size={12}
        className="justify-self-end text-faint opacity-0 transition-opacity group-hover:opacity-100"
      />
    </button>
  );

  return (
    <div className="card min-w-0 overflow-hidden">
      <div className="flex items-center gap-3 border-b border-hairline py-1.5 pr-3 pl-4">
        <span className="text-[13px] font-semibold">{t("Repositories")}</span>
        <label
          htmlFor="repository-filter"
          className="ml-auto flex h-7 w-42.5 items-center gap-2 rounded-md border border-hairline bg-wash px-2 transition-colors focus-within:border-line"
        >
          <MagnifyingGlassIcon size={12} className="shrink-0 text-faint" />
          <Input
            id="repository-filter"
            variant="compact"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t("Filter…")}
            aria-label={t("Filter repositories")}
          />
        </label>
      </div>
      <div
        className={`grid ${COLS} items-center gap-3 border-b border-hairline px-4 py-2`}
      >
        {sortHead(t("Repository"), "fullName")}
        <div className="flex justify-end">{sortHead(t("Stars"), "stars")}</div>
        <div className="flex justify-end">{sortHead(t("Forks"), "forks")}</div>
        <div className="flex justify-end">
          {sortHead(t("Downloads"), "downloads")}
        </div>
        <span />
      </div>
      {rows.length <= 30 ? (
        <ul>
          {rows.length === 0 ? (
            <li>
              <p className="px-5 py-8 text-center text-[13px] text-faint">
                {t("list.noResults", { query: query.trim() })}
              </p>
            </li>
          ) : (
            rows.map((repo) => (
              <li
                key={repo.fullName}
                className="border-b border-hairline last:border-b-0"
              >
                {renderRow(repo)}
              </li>
            ))
          )}
        </ul>
      ) : (
        <VList
          style={{ height: Math.min(480, rows.length * 57) }}
          itemSize={57}
        >
          {rows.map((repo) => (
            <div
              key={repo.fullName}
              className="border-b border-hairline last:border-b-0"
            >
              {renderRow(repo)}
            </div>
          ))}
        </VList>
      )}
    </div>
  );
}
