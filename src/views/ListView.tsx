import {
  ArrowClockwise,
  CaretDown,
  CaretRight,
  Code,
  Desktop,
  DownloadSimple,
  FolderSimple,
  GitFork,
  LockSimpleIcon,
  MagnifyingGlass,
  Star,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { useMemo, useState } from "react";
import { VList } from "virtua";
import { Banner } from "../components/Banner";
import { Button } from "../components/Button";
import { AreaChart, BarChart } from "../components/Charts";
import { Input } from "../components/Input";
import { KpiCard } from "../components/KpiCard";
import { ListSkeleton } from "../components/Skeleton";
import { fmtFetched, fmtNum, fmtSigned } from "../lib/format";
import { useI18n } from "../lib/i18n";
import { langColor } from "../lib/langcolors";
import { platformItems, sumPlatforms } from "../lib/platform";
import {
  aggregateHistory,
  delta,
  pickKpiDelta,
  sumDeltas,
  windowDelta,
} from "../lib/series";
import type { RepoHistory, TrackedRepo } from "../lib/types";

const COLS = "grid-cols-[minmax(0,1fr)_80px_80px_96px_24px]";

type SortKey = "fullName" | "stars" | "forks" | "downloads";

export function ListTrailing({
  refreshing,
  fetchedAt,
  onRefresh,
}: {
  refreshing: boolean;
  fetchedAt: number | null;
  onRefresh: () => void;
}) {
  const { t } = useI18n();
  const fetched = fmtFetched(fetchedAt);
  return (
    <div className="flex items-center gap-1">
      {refreshing ? (
        <span
          className="t-shimmer font-mono text-[12px] leading-none"
          data-text={t("Refreshing…")}
        >
          {t("Refreshing…")}
        </span>
      ) : fetched ? (
        <span className="inline-flex items-center gap-2 font-mono text-[12px] leading-none text-faint">
          <span className="h-[7px] w-[7px] rounded-full bg-ok" />
          {t("list.updated", { value: fetched })}
        </span>
      ) : null}
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        aria-label={t("Refresh")}
        title={t("Refresh")}
        className="grid h-7 w-7 place-items-center rounded-md text-mist transition-colors hover:bg-hover hover:text-paper disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ArrowClockwise
          size={14}
          className={refreshing ? "animate-spin" : ""}
        />
      </button>
    </div>
  );
}

export function ListView({
  repos,
  history,
  refreshing,
  banner,
  onOpenPicker,
  onOpenRepo,
}: {
  repos: TrackedRepo[];
  history: Record<string, RepoHistory>;
  refreshing: boolean;
  banner: string | null;
  onOpenPicker: () => void;
  onOpenRepo: (fullName: string) => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: number }>({
    key: "downloads",
    dir: -1,
  });

  const { stars, forks, downloads } = useMemo(
    () => ({
      stars: repos.reduce((sum, repo) => sum + repo.stars, 0),
      forks: repos.reduce((sum, repo) => sum + repo.forks, 0),
      downloads: repos.reduce((sum, repo) => sum + repo.downloads, 0),
    }),
    [repos],
  );

  const names = useMemo(() => repos.map((repo) => repo.fullName), [repos]);
  const starSeries = useMemo(
    () => aggregateHistory(history, names, "stars"),
    [history, names],
  );
  const downloadSeries = useMemo(
    () => aggregateHistory(history, names, "downloads"),
    [history, names],
  );
  const starDelta = useMemo(() => delta(starSeries), [starSeries]);
  const downloadDelta = useMemo(() => delta(downloadSeries), [downloadSeries]);
  const { starKpi, forkKpi, downloadKpi } = useMemo(
    () => ({
      starKpi: pickKpiDelta(
        windowDelta(starSeries, 7),
        sumDeltas(repos.map((repo) => repo.starsDelta)),
      ),
      forkKpi: pickKpiDelta(
        null,
        sumDeltas(repos.map((repo) => repo.forksDelta)),
      ),
      downloadKpi: pickKpiDelta(
        windowDelta(downloadSeries, 7),
        sumDeltas(repos.map((repo) => repo.downloadsDelta)),
      ),
    }),
    [starSeries, downloadSeries, repos],
  );
  const platformBars = useMemo(
    () => platformItems(sumPlatforms(repos.map((repo) => repo.platforms))),
    [repos],
  );

  const { chartItems, top, share, showChart } = useMemo(() => {
    const sorted = [...repos].sort((a, b) => b.downloads - a.downloads);
    const items = sorted.slice(0, 6).map((repo) => ({
      label: repo.fullName,
      value: repo.downloads,
      color: langColor(repo.language),
    }));
    const first = sorted[0];
    const total = sorted.reduce((sum, repo) => sum + repo.downloads, 0);
    return {
      chartItems: items,
      top: first,
      share:
        first && total > 0 ? Math.round((first.downloads / total) * 100) : 0,
      showChart: items.some((item) => item.value > 0),
    };
  }, [repos]);
  const { languages, langTotal, privateCount, silentCount, errorCount } =
    useMemo(() => {
      const langs = [
        ...repos.reduce((map, repo) => {
          const name = repo.language ?? "Unknown";
          map.set(name, (map.get(name) ?? 0) + 1);
          return map;
        }, new Map<string, number>()),
      ].sort((a, b) => b[1] - a[1]);
      return {
        languages: langs,
        langTotal: repos.length || 1,
        privateCount: repos.filter((repo) => repo.private).length,
        silentCount: repos.filter((repo) => repo.downloads === 0).length,
        errorCount: repos.filter((repo) => repo.error).length,
      };
    }, [repos]);

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
      prev.key === key
        ? { key, dir: -prev.dir }
        : { key, dir: key === "fullName" ? 1 : -1 },
    );
  }

  const showSkeleton = refreshing && repos.length === 0;

  return showSkeleton ? (
    <ListSkeleton />
  ) : (
    <div className="h-full min-h-0 overflow-auto px-6 pt-5 pb-6">
      <Banner message={banner ? `${t("errors.request")} ${banner}` : null} />

      <div className="grid grid-cols-4 gap-3">
        <KpiCard
          label={t("Repositories")}
          value={repos.length}
          icon={<FolderSimple size={15} />}
          sub={t("tracked")}
        />
        <KpiCard
          label={t("Stars")}
          value={stars}
          icon={<Star size={15} />}
          sub={t("total")}
          delta={starKpi?.delta}
          deltaHint={starKpi?.hint}
        />
        <KpiCard
          label={t("Forks")}
          value={forks}
          icon={<GitFork size={15} />}
          sub={t("total")}
          delta={forkKpi?.delta}
          deltaHint={forkKpi?.hint}
        />
        <KpiCard
          label={t("Downloads")}
          value={downloads}
          icon={<DownloadSimple size={15} />}
          sub={t("release assets")}
          hero
          delta={downloadKpi?.delta}
          deltaHint={downloadKpi?.hint}
        />
      </div>

      {repos.length > 0 ? (
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="card p-4">
            <div className="flex items-baseline justify-between gap-3">
              <div className="text-[13px] font-semibold">
                {t("Stars over time")}
              </div>
              {starDelta != null ? (
                <span className="font-mono text-[11.5px] text-faint tabular">
                  {t("list.range", { value: fmtSigned(starDelta) })}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[11.5px] leading-snug text-faint">
              {t(
                "Reconstructed from GitHub stargazers, then updated on each refresh.",
              )}
            </p>
            <div className="mt-3">
              <AreaChart
                points={starSeries}
                tone="paper"
                empty={t(
                  "Open a repository or refresh to reconstruct star history from GitHub.",
                )}
              />
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-baseline justify-between gap-3">
              <div className="text-[13px] font-semibold">
                {t("Downloads over time")}
              </div>
              {downloadDelta != null ? (
                <span className="font-mono text-[11.5px] text-faint tabular">
                  {t("list.range", { value: fmtSigned(downloadDelta) })}
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-[11.5px] leading-snug text-faint">
              {t(
                "GitHub does not publish download history. Asterism records a snapshot each refresh.",
              )}
            </p>
            <div className="mt-3">
              <AreaChart
                points={downloadSeries}
                tone="accent"
                empty={t("This chart fills in from the next refresh onward.")}
              />
            </div>
          </div>
        </div>
      ) : null}

      {repos.length === 0 ? (
        <div className="card mt-3 flex min-h-[240px] flex-col items-center justify-center px-8 text-center">
          <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
            {t("No repositories tracked")}
          </h2>
          <p className="mt-2 max-w-sm text-[12.5px] leading-relaxed text-mist">
            {t(
              "Choose the repositories you want to watch. Only that set is synced.",
            )}
          </p>
          <Button variant="primary" className="mt-4" onClick={onOpenPicker}>
            {t("Edit repositories")}
          </Button>
        </div>
      ) : (
        <div className="mt-3 grid items-start gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,1fr)]">
          <div className="flex min-w-0 flex-col gap-3">
            {showChart ? (
              <div className="card">
                <div className="flex items-center gap-3 border-b border-hairline px-4 py-2.5">
                  <span className="text-[13px] font-semibold">
                    {t("Downloads by repo")}
                  </span>
                  <span className="ml-auto font-mono text-[11.5px] text-faint tabular">
                    {t("list.total", { value: fmtNum(downloads) })}
                  </span>
                </div>
                <div className="p-4">
                  <BarChart items={chartItems} onSelect={onOpenRepo} />
                </div>
              </div>
            ) : null}

            <div className="card min-w-0 overflow-hidden">
              <div className="flex items-center gap-3 border-b border-hairline py-1.5 pr-3 pl-4">
                <span className="text-[13px] font-semibold">
                  {t("Repositories")}
                </span>
                <label
                  htmlFor="repository-filter"
                  className="ml-auto flex h-7 w-[170px] items-center gap-2 rounded-md border border-hairline bg-wash px-2 transition-colors focus-within:border-line"
                >
                  <MagnifyingGlass size={12} className="shrink-0 text-faint" />
                  <Input
                    id="repository-filter"
                    variant="compact"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={t("Filter…")}
                    aria-label={t("Filter repositories")}
                  />
                </label>
              </div>
              <div
                className={`grid ${COLS} items-center gap-3 border-b border-hairline px-4 py-2`}
              >
                <SortHead
                  label={t("Repository")}
                  k="fullName"
                  sort={sort}
                  onSort={toggleSort}
                />
                <div className="flex justify-end">
                  <SortHead
                    label={t("Stars")}
                    k="stars"
                    sort={sort}
                    onSort={toggleSort}
                  />
                </div>
                <div className="flex justify-end">
                  <SortHead
                    label={t("Forks")}
                    k="forks"
                    sort={sort}
                    onSort={toggleSort}
                  />
                </div>
                <div className="flex justify-end">
                  <SortHead
                    label={t("Downloads")}
                    k="downloads"
                    sort={sort}
                    onSort={toggleSort}
                  />
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
                              <span className="text-faint">
                                {repo.fullName.split("/")[0]}/
                              </span>
                              <span className="font-medium">
                                {repo.fullName.split("/")[1] ?? repo.fullName}
                              </span>
                            </span>
                            {repo.error ? (
                              <WarningCircleIcon
                                size={13}
                                className="shrink-0 text-accent-soft"
                              />
                            ) : null}
                            {repo.private ? <Chip>{t("Private")}</Chip> : null}
                          </span>
                          <NumCell
                            value={repo.stars}
                            delta={repo.starsDelta}
                            strong={false}
                          />
                          <NumCell
                            value={repo.forks}
                            delta={repo.forksDelta}
                            strong={false}
                          />
                          <NumCell
                            value={repo.downloads}
                            delta={repo.downloadsDelta}
                            strong
                          />
                          <CaretRight
                            size={12}
                            className="justify-self-end text-faint opacity-0 transition-opacity group-hover:opacity-100"
                          />
                        </button>
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
                            <span className="text-faint">
                              {repo.fullName.split("/")[0]}/
                            </span>
                            <span className="font-medium">
                              {repo.fullName.split("/")[1] ?? repo.fullName}
                            </span>
                          </span>
                          {repo.error ? (
                            <WarningCircleIcon
                              size={13}
                              className="shrink-0 text-accent-soft"
                            />
                          ) : null}
                          {repo.private ? <Chip>{t("Private")}</Chip> : null}
                        </span>
                        <NumCell
                          value={repo.stars}
                          delta={repo.starsDelta}
                          strong={false}
                        />
                        <NumCell
                          value={repo.forks}
                          delta={repo.forksDelta}
                          strong={false}
                        />
                        <NumCell
                          value={repo.downloads}
                          delta={repo.downloadsDelta}
                          strong
                        />
                        <CaretRight
                          size={12}
                          className="justify-self-end text-faint opacity-0 transition-opacity group-hover:opacity-100"
                        />
                      </button>
                    </div>
                  ))}
                </VList>
              )}
            </div>
          </div>

          <div className="flex min-w-0 flex-col gap-3">
            {top ? (
              <button
                type="button"
                onClick={() => onOpenRepo(top.fullName)}
                className="card w-full p-4 text-left transition-colors hover:bg-hover"
              >
                <div className="flex items-center gap-2 text-mist">
                  <Star size={14} className="text-faint" />
                  <span className="kpi-label">{t("Top repository")}</span>
                </div>
                <p className="mt-2.5 truncate font-mono text-[15px] font-semibold tracking-[-0.01em]">
                  {top.fullName}
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <div>
                    <div className="text-[11px] leading-none text-faint">
                      {t("Stars")}
                    </div>
                    <div className="mt-1.5 font-mono text-[16px] leading-none font-semibold tabular">
                      {fmtNum(top.stars)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] leading-none text-faint">
                      {t("Downloads")}
                    </div>
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
                  {t("list.share", { value: fmtNum(share) })}
                </p>
              </button>
            ) : null}

            {platformBars.length > 0 ? (
              <div className="card p-4">
                <div className="flex items-center gap-2 text-mist">
                  <Desktop size={14} className="text-faint" />
                  <span className="kpi-label">
                    {t("Downloads by platform")}
                  </span>
                </div>
                <div className="mt-3">
                  <BarChart
                    items={platformBars.map((item) => ({
                      ...item,
                      label: item.label === "Other" ? t("Other") : item.label,
                    }))}
                  />
                </div>
              </div>
            ) : null}

            {languages.length > 0 ? (
              <div className="card p-4">
                <div className="flex items-center gap-2 text-mist">
                  <Code size={14} className="text-faint" />
                  <span className="kpi-label">{t("Languages")}</span>
                </div>
                <ul className="mt-3 space-y-2">
                  {languages.map(([name, count]) => {
                    const pct = (count / langTotal) * 100;
                    return (
                      <li
                        key={name}
                        className="grid grid-cols-[1fr_28px] items-center gap-2"
                      >
                        <span className="min-w-0">
                          <span className="flex min-w-0 items-center gap-1.5 text-[12.5px]">
                            <span
                              className="h-1.5 w-1.5 shrink-0 rounded-full"
                              style={{
                                background: langColor(
                                  name === "Unknown" ? null : name,
                                ),
                              }}
                            />
                            <span className="truncate">
                              {name === "Unknown" ? t("Unknown") : name}
                            </span>
                          </span>
                          <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-raised">
                            <span
                              className="block h-full rounded-full"
                              style={{
                                width: `${Math.max(pct, 8)}%`,
                                background: langColor(
                                  name === "Unknown" ? null : name,
                                ),
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
                <span className="kpi-label">{t("Tracked set")}</span>
              </div>
              <dl className="mt-3 space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-1.5 text-[12.5px] text-mist">
                    <LockSimpleIcon size={12} className="text-faint" />
                    {t("Private")}
                  </dt>
                  <dd className="font-mono text-[12.5px] tabular">
                    {fmtNum(privateCount)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="flex items-center gap-1.5 text-[12.5px] text-mist">
                    <DownloadSimple size={12} className="text-faint" />
                    {t("No downloads")}
                  </dt>
                  <dd className="font-mono text-[12.5px] tabular">
                    {fmtNum(silentCount)}
                  </dd>
                </div>
                {errorCount > 0 ? (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="flex items-center gap-1.5 text-[12.5px] text-accent-soft">
                      <WarningCircleIcon size={12} />
                      {t("Failed")}
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

function NumCell({
  value,
  delta,
  strong,
}: {
  value: number;
  delta?: number | null;
  strong: boolean;
}) {
  return (
    <span className="text-right">
      <span
        className={`block text-[12.5px] tabular ${
          value > 0 ? (strong ? "font-medium" : "") : "text-faint"
        }`}
      >
        {fmtNum(value)}
      </span>
      {delta != null && delta !== 0 ? (
        <span
          className={`block font-mono text-[10px] leading-tight tabular ${
            delta > 0 ? "text-ok" : "text-accent-soft"
          }`}
        >
          {fmtSigned(delta)}
        </span>
      ) : null}
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
