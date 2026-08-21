import { useMemo, useState } from "react";
import {
  ArrowClockwise,
  CaretDown,
  CaretRight,
  CircleNotch,
  Clock,
  DownloadSimple,
  FolderSimple,
  GitFork,
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

const COLS = "grid-cols-[minmax(0,1fr)_88px_88px_104px_28px]";

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
  const top = byDownloads[0];
  const chartItems = byDownloads
    .slice(0, 6)
    .map((repo) => ({ label: repo.fullName, value: repo.downloads, color: langColor(repo.language) }));
  const share = top && downloads > 0 ? Math.round((top.downloads / downloads) * 100) : 0;

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
      title={<h1 className="text-[17px] font-semibold tracking-[-0.01em]">Overview</h1>}
      trailing={
        <>
          {fetched ? (
            <span className="mr-1 inline-flex items-center gap-2 font-mono text-[12px] leading-none text-faint">
              {refreshing ? (
                <>
                  <CircleNotch size={12} className="animate-spin" />
                  Refreshing…
                </>
              ) : (
                <>
                  <span className="h-[7px] w-[7px] rounded-full bg-ok" />
                  Updated {fetched}
                </>
              )}
            </span>
          ) : null}
          <Button variant="ghost" onClick={onRefresh} disabled={refreshing} aria-label="Refresh">
            <ArrowClockwise size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </Button>
          <Button variant="primary" onClick={onOpenPicker}>
            <FolderSimple size={14} />
            Edit repositories
          </Button>
        </>
      }
    >
      {showSkeleton ? (
        <ListSkeleton />
      ) : (
        <div className="h-full min-h-0 overflow-auto px-7 pt-6 pb-8">
          {banner ? (
            <div className="mb-3.5 flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/[0.06] px-3.5 py-2.5 text-[13px] text-accent-soft">
              <WarningCircle size={15} className="shrink-0" />
              <span className="truncate">{banner}</span>
            </div>
          ) : null}

          <div className="grid grid-cols-4 gap-3.5">
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
            <div className="card mt-3.5 flex min-h-[280px] flex-col items-center justify-center px-8 text-center">
              <h2 className="text-[18px] font-semibold tracking-[-0.02em]">
                No repositories tracked
              </h2>
              <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-mist">
                Choose the repositories you want to watch. Only that set is synced.
              </p>
              <Button variant="primary" className="mt-5" onClick={onOpenPicker}>
                Edit repositories
              </Button>
            </div>
          ) : (
            <div className="mt-3.5 grid items-start gap-3.5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,1fr)]">
              <div className="flex min-w-0 flex-col gap-3.5">
                {chartItems.some((item) => item.value > 0) ? (
                  <div className="card">
                    <div className="flex items-center gap-3 border-b border-hairline px-5 py-3">
                      <span className="text-[13.5px] font-semibold">
                        Downloads by repo
                      </span>
                      <span className="ml-auto font-mono text-[12px] text-faint tabular">
                        total {fmtNum(downloads)}
                      </span>
                    </div>
                    <div className="p-5">
                      <BarChart items={chartItems} />
                    </div>
                  </div>
                ) : null}

                <div className="card overflow-hidden">
                  <div className="flex items-center gap-3 border-b border-hairline py-2 pr-4 pl-5">
                    <span className="text-[13.5px] font-semibold">Repositories</span>
                    <label className="ml-auto flex h-8 w-[190px] items-center gap-2 rounded-lg border border-hairline bg-white/[0.02] px-2.5 transition-colors focus-within:border-line">
                      <MagnifyingGlass size={13} className="shrink-0 text-faint" />
                      <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Filter…"
                        aria-label="Filter repositories"
                        className="w-full bg-transparent text-[12.5px] leading-none outline-none placeholder:text-faint"
                      />
                    </label>
                  </div>
                  <div className={`grid ${COLS} items-center gap-3 border-b border-hairline px-5 py-2.5`}>
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
                          className={`group grid w-full ${COLS} items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-white/[0.03]`}
                        >
                          <span className="flex min-w-0 items-center gap-2.5">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ background: langColor(repo.language) }}
                            />
                            <span className="truncate text-[13px]">
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

              <div className="flex min-w-0 flex-col gap-3.5">
                <div className="card p-5">
                  <div className="flex items-center gap-2 text-mist">
                    <Star size={14} className="text-faint" />
                    <span className="kpi-label">Top repository</span>
                  </div>
                  {top ? (
                    <>
                      <p className="mt-3 truncate font-mono text-[17px] font-semibold tracking-[-0.01em]">
                        {top.fullName}
                      </p>
                      <div className="mt-3.5 grid grid-cols-2 gap-2.5">
                        <div>
                          <div className="text-[11.5px] leading-none text-faint">Stars</div>
                          <div className="mt-1.5 font-mono text-[20px] leading-none font-semibold tabular">
                            {fmtNum(top.stars)}
                          </div>
                        </div>
                        <div>
                          <div className="text-[11.5px] leading-none text-faint">Downloads</div>
                          <div className="mt-1.5 font-mono text-[20px] leading-none font-semibold text-accent-soft tabular">
                            {fmtNum(top.downloads)}
                          </div>
                        </div>
                      </div>
                      <div className="mt-3.5 h-2 overflow-hidden rounded-full bg-raised">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-accent to-accent-hover"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                      <p className="mt-2.5 text-[12px] leading-snug text-faint">
                        Accounts for {share}% of total downloads
                      </p>
                    </>
                  ) : (
                    <p className="mt-3 text-[13px] text-faint">No data yet.</p>
                  )}
                </div>

                <div className="card p-5">
                  <div className="flex items-center gap-2 text-mist">
                    <Clock size={14} className="text-faint" />
                    <span className="kpi-label">Last sync</span>
                  </div>
                  <p className="mt-3 font-mono text-[20px] leading-none font-semibold tabular">
                    {fetched ?? "—"}
                  </p>
                  <p className="mt-2 text-[12px] leading-none text-faint">
                    GitHub REST + Traffic API · local cache
                  </p>
                </div>

                {forks === 0 ? (
                  <div className="card overflow-hidden">
                    <div className="border-b border-hairline px-5 py-3 text-[13.5px] font-semibold">
                      Forks
                    </div>
                    <p className="px-5 py-6 text-center text-[12.5px] leading-relaxed text-faint">
                      No tracked repositories have forks yet.
                    </p>
                  </div>
                ) : null}
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
      className={`inline-flex cursor-pointer items-center gap-1 font-mono text-[11px] uppercase tracking-[0.07em] whitespace-nowrap transition-colors ${
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
      className={`text-right text-[13px] tabular ${
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
