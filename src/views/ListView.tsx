import { useMemo, useState } from "react";
import {
  ArrowClockwise,
  CaretDown,
  CaretRight,
  Code,
  DownloadSimple,
  FolderSimple,
  GitFork,
  LockSimple,
  MagnifyingGlass,
  Star,
  WarningCircle,
} from "@phosphor-icons/react";
import { BarChart } from "../components/Charts";
import { Button } from "../components/Button";
import { Chrome } from "../components/Chrome";
import { KpiCard } from "../components/KpiCard";
import { ListSkeleton } from "../components/Skeleton";
import { fmtFetched, fmtNum } from "../lib/format";
import { langColor } from "../lib/langcolors";
import type { TrackedRepo } from "../lib/types";

const COLS = "grid-cols-[minmax(0,1fr)_80px_80px_96px_24px]";

type SortKey = "fullName" | "stars" | "forks" | "downloads";

export function ListView({
  login,
  repos,
  refreshing,
  fetchedAt,
  banner,
  onRefresh,
  onOpenPicker,
  onOpenRepo,
}: {
  login: string | null;
  repos: TrackedRepo[];
  refreshing: boolean;
  fetchedAt: number | null;
  banner: string | null;
  onRefresh: () => void;
  onOpenPicker: () => void;
  onOpenRepo: (fullName: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: number }>({
    key: "downloads",
    dir: -1,
  });

  const fetched = fmtFetched(fetchedAt);
  const stars = repos.reduce((sum, repo) => sum + repo.stars, 0);
  const forks = repos.reduce((sum, repo) => sum + repo.forks, 0);
  const downloads = repos.reduce((sum, repo) => sum + repo.downloads, 0);

  const byDownloads = [...repos].sort((a, b) => b.downloads - a.downloads);
  const chartItems = byDownloads.slice(0, 6).map((repo) => ({
    label: repo.fullName,
    value: repo.downloads,
    color: langColor(repo.language),
  }));
  const top = byDownloads[0];
  const share = top && downloads > 0 ? Math.round((top.downloads / downloads) * 100) : 0;
  const showChart = chartItems.some((item) => item.value > 0);
  const languages = [...repos.reduce((map, repo) => {
    const name = repo.language ?? "Unknown";
    map.set(name, (map.get(name) ?? 0) + 1);
    return map;
  }, new Map<string, number>())].sort((a, b) => b[1] - a[1]);
  const langTotal = repos.length || 1;
  const privateCount = repos.filter((repo) => repo.private).length;
  const silentCount = repos.filter((repo) => repo.downloads === 0).length;
  const errorCount = repos.filter((repo) => repo.error).length;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = repos.filter(
      (repo) =>
        !q ||
        repo.fullName.toLowerCase().includes(q) ||
        (repo.language ?? "").toLowerCase().includes(q),
    );
    return filtered.sort((a, b) => {
      if (sort.key === "fullName") {
        return a.fullName.localeCompare(b.fullName) * sort.dir;
      }
      return (a[sort.key] - b[sort.key]) * sort.dir;
    });
  }, [repos, query, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key ? { key, dir: -prev.dir } : { key, dir: key === "fullName" ? 1 : -1 },
    );
  }

  const showSkeleton = refreshing && repos.length === 0;

  return (
    <Chrome
      login={login}
      nav="overview"
      onNav={(id) => {
        if (id === "repos") onOpenPicker();
      }}
      trackedCount={repos.length}
      title={<h1 className="text-[15px] font-semibold tracking-[-0.01em]">Overview</h1>}
      trailing={
        <div className="flex items-center gap-1">
          {refreshing ? (
            <span className="font-mono text-[12px] leading-none text-faint">Refreshing…</span>
          ) : fetched ? (
            <span className="inline-flex items-center gap-2 font-mono text-[12px] leading-none text-faint">
              <span className="h-[7px] w-[7px] rounded-full bg-ok" />
              Updated {fetched}
            </span>
          ) : null}
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            aria-label="Refresh"
            title="Refresh"
            className="grid h-7 w-7 place-items-center rounded-md text-mist transition-colors hover:bg-white/[0.06] hover:text-paper disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowClockwise size={14} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      }
    >
      {showSkeleton ? (
        <ListSkeleton />
      ) : (
        <div className="h-full min-h-0 overflow-auto px-6 pt-5 pb-6">
          {banner ? (
            <div className="mb-3 flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/[0.06] px-3 py-2 text-[12.5px] text-accent-soft">
              <WarningCircle size={14} className="shrink-0" />
              <span className="truncate">{banner}</span>
            </div>
          ) : null}

          <div className="grid grid-cols-4 gap-3">
            <KpiCard
              label="Repositories"
              value={repos.length}
              icon={<FolderSimple size={15} />}
              sub="tracked"
            />
            <KpiCard label="Stars" value={stars} icon={<Star size={15} />} sub="total" />
            <KpiCard label="Forks" value={forks} icon={<GitFork size={15} />} sub="total" />
            <KpiCard
              label="Downloads"
              value={downloads}
              icon={<DownloadSimple size={15} />}
              sub="release assets"
              hero
            />
          </div>

          {repos.length === 0 ? (
            <div className="card mt-3 flex min-h-[240px] flex-col items-center justify-center px-8 text-center">
              <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
                No repositories tracked
              </h2>
              <p className="mt-2 max-w-sm text-[12.5px] leading-relaxed text-mist">
                Choose the repositories you want to watch. Only that set is synced.
              </p>
              <Button variant="primary" className="mt-4" onClick={onOpenPicker}>
                Edit repositories
              </Button>
            </div>
          ) : (
            <div className="mt-3 grid items-start gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,1fr)]">
              <div className="flex min-w-0 flex-col gap-3">
                {showChart ? (
                  <div className="card">
                    <div className="flex items-center gap-3 border-b border-hairline px-4 py-2.5">
                      <span className="text-[13px] font-semibold">Downloads by repo</span>
                      <span className="ml-auto font-mono text-[11.5px] text-faint tabular">
                        total {fmtNum(downloads)}
                      </span>
                    </div>
                    <div className="p-4">
                      <BarChart items={chartItems} onSelect={onOpenRepo} />
                    </div>
                  </div>
                ) : null}

                <div className="card min-w-0 overflow-hidden">
                  <div className="flex items-center gap-3 border-b border-hairline py-1.5 pr-3 pl-4">
                    <span className="text-[13px] font-semibold">Repositories</span>
                    <label className="ml-auto flex h-7 w-[170px] items-center gap-2 rounded-md border border-hairline bg-white/[0.02] px-2 transition-colors focus-within:border-line">
                      <MagnifyingGlass size={12} className="shrink-0 text-faint" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Filter…"
                        aria-label="Filter repositories"
                        className="w-full bg-transparent text-[12px] leading-none outline-none placeholder:text-faint"
                      />
                    </label>
                  </div>
                  <div className={`grid ${COLS} items-center gap-3 border-b border-hairline px-4 py-2`}>
                    <SortHead label="Repository" k="fullName" sort={sort} onSort={toggleSort} />
                    <div className="flex justify-end">
                      <SortHead label="Stars" k="stars" sort={sort} onSort={toggleSort} />
                    </div>
                    <div className="flex justify-end">
                      <SortHead label="Forks" k="forks" sort={sort} onSort={toggleSort} />
                    </div>
                    <div className="flex justify-end">
                      <SortHead label="Downloads" k="downloads" sort={sort} onSort={toggleSort} />
                    </div>
                    <span />
                  </div>
                  <ul>
                    {rows.map((repo) => (
                      <li key={repo.fullName} className="border-b border-hairline last:border-b-0">
                        <button
                          type="button"
                          onClick={() => onOpenRepo(repo.fullName)}
                          className={`group grid w-full ${COLS} items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.03]`}
                        >
                          <span className="flex min-w-0 items-center gap-2">
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{ background: langColor(repo.language) }}
                            />
                            <span className="truncate text-[12.5px]">
                              <span className="text-faint">
                                {repo.fullName.split("/")[0]}/
                              </span>
                              <span className="font-medium">
                                {repo.fullName.split("/")[1] ?? repo.fullName}
                              </span>
                            </span>
                            {repo.error ? (
                              <WarningCircle size={13} className="shrink-0 text-accent-soft" />
                            ) : null}
                            {repo.private ? <Chip>Private</Chip> : null}
                          </span>
                          <NumCell value={repo.stars} strong={false} />
                          <NumCell value={repo.forks} strong={false} />
                          <NumCell value={repo.downloads} strong />
                          <CaretRight
                            size={12}
                            className="justify-self-end text-faint opacity-0 transition-opacity group-hover:opacity-100"
                          />
                        </button>
                      </li>
                    ))}
                    {rows.length === 0 ? (
                      <li>
                        <p className="px-5 py-8 text-center text-[13px] text-faint">
                          No results for “{query.trim()}”.
                        </p>
                      </li>
                    ) : null}
                  </ul>
                </div>
              </div>

              <div className="flex min-w-0 flex-col gap-3">
                {top ? (
                  <button
                    type="button"
                    onClick={() => onOpenRepo(top.fullName)}
                    className="card w-full p-4 text-left transition-colors hover:bg-white/[0.03]"
                  >
                    <div className="flex items-center gap-2 text-mist">
                      <Star size={14} className="text-faint" />
                      <span className="kpi-label">Top repository</span>
                    </div>
                    <p className="mt-2.5 truncate font-mono text-[15px] font-semibold tracking-[-0.01em]">
                      {top.fullName}
                    </p>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div>
                        <div className="text-[11px] leading-none text-faint">Stars</div>
                        <div className="mt-1.5 font-mono text-[16px] leading-none font-semibold tabular">
                          {fmtNum(top.stars)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] leading-none text-faint">Downloads</div>
                        <div className="mt-1.5 font-mono text-[16px] leading-none font-semibold text-accent-soft tabular">
                          {fmtNum(top.downloads)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-raised">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hover"
                        style={{ width: `${share}%` }}
                      />
                    </div>
                    <p className="mt-2 text-[11.5px] leading-snug text-faint">
                      {share}% of total downloads
                    </p>
                  </button>
                ) : null}

                {languages.length > 0 ? (
                  <div className="card p-4">
                    <div className="flex items-center gap-2 text-mist">
                      <Code size={14} className="text-faint" />
                      <span className="kpi-label">Languages</span>
                    </div>
                    <ul className="mt-3 space-y-2">
                      {languages.map(([name, count]) => {
                        const pct = (count / langTotal) * 100;
                        return (
                          <li key={name} className="grid grid-cols-[1fr_28px] items-center gap-2">
                            <span className="min-w-0">
                              <span className="flex min-w-0 items-center gap-1.5 text-[12.5px]">
                                <span
                                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                                  style={{ background: langColor(name === "Unknown" ? null : name) }}
                                />
                                <span className="truncate">{name}</span>
                              </span>
                              <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-raised">
                                <span
                                  className="block h-full rounded-full"
                                  style={{
                                    width: `${Math.max(pct, 8)}%`,
                                    background: langColor(name === "Unknown" ? null : name),
                                  }}
                                />
                              </span>
                            </span>
                            <span className="text-right font-mono text-[11.5px] text-mist tabular">
                              {count}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}

                <div className="card p-4">
                  <div className="flex items-center gap-2 text-mist">
                    <FolderSimple size={14} className="text-faint" />
                    <span className="kpi-label">Tracked set</span>
                  </div>
                  <dl className="mt-3 space-y-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="flex items-center gap-1.5 text-[12.5px] text-mist">
                        <LockSimple size={12} className="text-faint" />
                        Private
                      </dt>
                      <dd className="font-mono text-[12.5px] tabular">{fmtNum(privateCount)}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="flex items-center gap-1.5 text-[12.5px] text-mist">
                        <DownloadSimple size={12} className="text-faint" />
                        No downloads
                      </dt>
                      <dd className="font-mono text-[12.5px] tabular">{fmtNum(silentCount)}</dd>
                    </div>
                    {errorCount > 0 ? (
                      <div className="flex items-center justify-between gap-3">
                        <dt className="flex items-center gap-1.5 text-[12.5px] text-accent-soft">
                          <WarningCircle size={12} />
                          Failed
                        </dt>
                        <dd className="font-mono text-[12.5px] text-accent-soft tabular">
                          {fmtNum(errorCount)}
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </Chrome>
  );
}

function SortHead({
  label,
  k,
  sort,
  onSort,
}: {
  label: string;
  k: SortKey;
  sort: { key: SortKey; dir: number };
  onSort: (key: SortKey) => void;
}) {
  const active = sort.key === k;
  return (
    <button
      type="button"
      onClick={() => onSort(k)}
      className={`inline-flex cursor-pointer items-center gap-0.5 text-[11px] font-medium whitespace-nowrap transition-colors ${
        active ? "text-accent-soft" : "text-faint hover:text-mist"
      }`}
    >
      {label}
      <CaretDown
        size={10}
        className={`${active && sort.dir === 1 ? "rotate-180 " : ""}transition-opacity ${
          active ? "opacity-100" : "opacity-0"
        }`}
      />
    </button>
  );
}

function NumCell({ value, strong }: { value: number; strong: boolean }) {
  return (
    <span
      className={`text-right text-[12.5px] tabular ${
        value > 0 ? (strong ? "font-medium" : "") : "text-faint"
      }`}
    >
      {fmtNum(value)}
    </span>
  );
}

function Chip({ children }: { children: string }) {
  return (
    <span className="shrink-0 rounded-md border border-line px-1.5 py-px font-mono text-[10px] tracking-wide uppercase text-mist">
      {children}
    </span>
  );
}
