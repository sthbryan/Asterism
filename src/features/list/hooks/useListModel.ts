import { useMemo } from "react";
import { langColor } from "@/lib/langcolors";
import { platformItems, sumPlatforms } from "@/lib/platform";
import { aggregateHistory, pickKpiDelta, sumDeltas } from "@/lib/series";
import type { RepoHistory, TrackedRepo } from "@/lib/types";
import type { ListSort } from "./useListControls";

export type ListModelArgs = {
  repos: TrackedRepo[];
  history: Record<string, RepoHistory>;
  query: string;
  sort: ListSort;
};

/**
 * Derived overview data: totals, sync deltas, download chart,
 * sidebar aggregates and filtered/sorted table rows.
 * Pure derivations live here so the view only composes UI.
 */
export function useListModel({ repos, history, query, sort }: ListModelArgs) {
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
      star: pickKpiDelta(null, sumDeltas(repos.map((repo) => repo.starsDelta))),
      fork: pickKpiDelta(null, sumDeltas(repos.map((repo) => repo.forksDelta))),
      download: pickKpiDelta(
        null,
        sumDeltas(repos.map((repo) => repo.downloadsDelta)),
      ),
    }),
    [repos],
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

  const platformBars = useMemo(
    () => platformItems(sumPlatforms(repos.map((repo) => repo.platforms))),
    [repos],
  );

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

  return {
    totals,
    starSeries,
    downloadSeries,
    kpis,
    chart,
    sidebar,
    platformBars,
    rows,
  };
}
