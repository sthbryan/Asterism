import {
  ArrowClockwiseIcon,
  DownloadSimpleIcon,
  FolderSimpleIcon,
  GitForkIcon,
  StarIcon,
} from "@phosphor-icons/react";
import { cn } from "cn";
import { useMemo, useState } from "react";
import { useI18n } from "@/app/hooks";
import { detailPath } from "@/app/routes";
import { useStore } from "@/app/store";
import { useTransitionNavigate } from "@/app/useViewTransition";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { BarChart } from "@/components/Charts";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { ListSkeleton } from "@/components/Skeleton";
import { fmtFetched, fmtNum } from "@/lib/format";
import { langColor } from "@/lib/langcolors";
import { platformItems, sumPlatforms } from "@/lib/platform";
import {
  aggregateHistory,
  pickKpiDelta,
  sumDeltas,
  windowDelta,
} from "@/lib/series";
import { ListCharts } from "./ListCharts";
import { ListSidebar } from "./ListSidebar";
import { RepositoryTable } from "./RepositoryTable";

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
  const { t, locale } = useI18n();
  const online = useStore((s) => s.status?.ok && !s.connecting);
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
          <span
            className={cn(
              "size-1.5 rounded-full",
              online ? "bg-ok" : "bg-faint",
            )}
          />
          {t("list.updated", {
            value: fetchedAt
              ? new Intl.DateTimeFormat(locale, {
                  dateStyle: "medium",
                  timeStyle: "short",
                }).format(fetchedAt * 1000)
              : fetched,
          })}
        </span>
      ) : null}
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing || !online}
        aria-label={t("Refresh")}
        title={t("Refresh")}
        className="grid h-7 w-7 place-items-center rounded-md text-mist transition-colors hover:bg-hover hover:text-paper disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ArrowClockwiseIcon
          size={14}
          className={refreshing ? "animate-spin" : ""}
        />
      </button>
    </div>
  );
}

export function ListView() {
  const { t } = useI18n();
  const navigate = useTransitionNavigate();
  const selectedNames = useStore((s) => s.selectedNames);
  const repos = useStore((s) => s.tracked);
  const history = useStore((s) => s.history);
  const refreshing = useStore((s) => s.refreshing);
  const banner = useStore((s) => s.banner);
  const fetchedAt = useStore((s) => s.fetchedAt);
  const booted = useStore((s) => s.booted);
  const runRefresh = useStore((s) => s.runRefresh);
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState<7 | 30>(7);
  const [sort, setSort] = useState<{ key: SortKey; dir: number }>({
    key: "downloads",
    dir: -1,
  });
  const openRepo = (fullName: string) => navigate(detailPath(fullName));

  const totals = useMemo(
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
  const kpis = useMemo(
    () => ({
      star: pickKpiDelta(
        windowDelta(starSeries, period),
        sumDeltas(repos.map((repo) => repo.starsDelta)),
      ),
      fork: pickKpiDelta(null, sumDeltas(repos.map((repo) => repo.forksDelta))),
      download: pickKpiDelta(
        windowDelta(downloadSeries, period),
        sumDeltas(repos.map((repo) => repo.downloadsDelta)),
      ),
    }),
    [starSeries, downloadSeries, repos, period],
  );
  const chart = useMemo(() => {
    const sorted = [...repos].sort((a, b) => b.downloads - a.downloads);
    const top = sorted[0];
    const total = sorted.reduce((sum, repo) => sum + repo.downloads, 0);
    return {
      top,
      share: top && total > 0 ? Math.round((top.downloads / total) * 100) : 0,
      items: sorted.slice(0, 6).map((repo) => ({
        label: repo.fullName,
        value: repo.downloads,
        color: langColor(repo.language),
      })),
      show: sorted.some((repo) => repo.downloads > 0),
    };
  }, [repos]);
  const sidebar = useMemo(() => {
    const languages = [
      ...repos.reduce((map, repo) => {
        const name = repo.language ?? "Unknown";
        map.set(name, (map.get(name) ?? 0) + 1);
        return map;
      }, new Map<string, number>()),
    ].sort((a, b) => b[1] - a[1]);
    return {
      languages,
      privateCount: repos.filter((repo) => repo.private).length,
      silentCount: repos.filter((repo) => repo.downloads === 0).length,
      errorCount: repos.filter((repo) => repo.error).length,
    };
  }, [repos]);
  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return repos
      .filter(
        (repo) =>
          !q ||
          repo.fullName.toLowerCase().includes(q) ||
          (repo.language ?? "").toLowerCase().includes(q),
      )
      .sort((a, b) =>
        sort.key === "fullName"
          ? a.fullName.localeCompare(b.fullName) * sort.dir
          : (a[sort.key] - b[sort.key]) * sort.dir,
      );
  }, [repos, query, sort]);
  const toggleSort = (key: SortKey) =>
    setSort((previous) =>
      previous.key === key
        ? { key, dir: -previous.dir }
        : { key, dir: key === "fullName" ? 1 : -1 },
    );

  return (
    <>
      <PageHeader
        title={
          <h1 className="text-[15px] font-semibold tracking-[-0.01em]">
            {t("Overview")}
          </h1>
        }
        trailing={
          <ListTrailing
            refreshing={refreshing}
            fetchedAt={fetchedAt}
            onRefresh={() => void runRefresh()}
          />
        }
      />
      <div className={`t-skel h-full ${booted ? "is-revealed" : ""}`}>
        <div className="t-skel-skeleton is-pulsing">
          <ListSkeleton />
        </div>
        <div className="t-skel-content">
          <div className="h-full min-h-0 overflow-auto px-6 pt-5 pb-6">
            <Banner
              message={banner ? `${t("errors.request")} ${banner}` : null}
            />
            {repos.some((repo) => repo.error) ||
            selectedNames.length > repos.length ? (
              <p role="status" className="mb-3 text-sm text-mist">
                {t("offline.partial")}
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiCard
                label={t("Repositories")}
                value={selectedNames.length}
                icon={<FolderSimpleIcon size={15} />}
                sub={t("tracked")}
              />
              <KpiCard
                label={t("Stars")}
                value={repos.length ? totals.stars : null}
                icon={<StarIcon size={15} />}
                sub={t("common.total")}
                delta={kpis.star?.delta}
                deltaHint={kpis.star?.hint}
              />
              <KpiCard
                label={t("Forks")}
                value={repos.length ? totals.forks : null}
                icon={<GitForkIcon size={15} />}
                sub={t("common.total")}
                delta={kpis.fork?.delta}
                deltaHint={kpis.fork?.hint}
              />
              <KpiCard
                label={t("Downloads")}
                value={repos.length ? totals.downloads : null}
                icon={<DownloadSimpleIcon size={15} />}
                sub={t("release assets")}
                hero
                delta={kpis.download?.delta}
                deltaHint={kpis.download?.hint}
              />
            </div>
            {repos.length > 0 ? (
              <ListCharts
                starSeries={starSeries}
                downloadSeries={downloadSeries}
                period={period}
                onPeriodChange={setPeriod}
                referenceTs={fetchedAt ?? undefined}
              />
            ) : null}
            {repos.length === 0 ? (
              <div className="card mt-3 flex min-h-60 flex-col items-center justify-center px-8 text-center">
                <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
                  {t("No repositories tracked")}
                </h2>
                <p className="mt-2 max-w-sm text-[12.5px] leading-relaxed text-mist">
                  {t(
                    "Choose the repositories you want to watch. Only that set is synced.",
                  )}
                </p>
                <Button
                  variant="primary"
                  className="mt-4"
                  onClick={() => navigate("/repos")}
                >
                  {t("Edit repositories")}
                </Button>
              </div>
            ) : (
              <div className="mt-3 grid items-start gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,1fr)]">
                <div className="flex min-w-0 flex-col gap-3">
                  {chart.show ? (
                    <div className="card">
                      <div className="flex items-center gap-3 border-b border-hairline px-4 py-2.5">
                        <span className="text-[13px] font-semibold">
                          {t("Downloads by repo")}
                        </span>
                        <span className="ml-auto font-mono text-[11.5px] text-faint tabular">
                          {t("list.total", { value: fmtNum(totals.downloads) })}
                        </span>
                      </div>
                      <div className="p-4">
                        <BarChart items={chart.items} onSelect={openRepo} />
                      </div>
                    </div>
                  ) : null}
                  <RepositoryTable
                    rows={rows}
                    query={query}
                    sort={sort}
                    onQueryChange={setQuery}
                    onSort={toggleSort}
                    onOpenRepo={openRepo}
                  />
                </div>
                <ListSidebar
                  top={chart.top}
                  share={chart.share}
                  platformBars={platformItems(
                    sumPlatforms(repos.map((repo) => repo.platforms)),
                  )}
                  languages={sidebar.languages}
                  langTotal={repos.length || 1}
                  privateCount={sidebar.privateCount}
                  silentCount={sidebar.silentCount}
                  errorCount={sidebar.errorCount}
                  onOpenRepo={openRepo}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
