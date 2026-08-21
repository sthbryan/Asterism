import { ArrowClockwise, Plus } from "@phosphor-icons/react";
import { BarChart } from "../components/Charts";
import { Button } from "../components/Button";
import { Chrome } from "../components/Chrome";
import { KpiCard } from "../components/KpiCard";
import { fmtFetched, fmtNum } from "../lib/format";
import type { TrackedRepo } from "../lib/types";

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
  const fetched = fmtFetched(fetchedAt);
  const stars = repos.reduce((sum, repo) => sum + repo.stars, 0);
  const forks = repos.reduce((sum, repo) => sum + repo.forks, 0);
  const downloads = repos.reduce((sum, repo) => sum + repo.downloads, 0);
  const chartItems = [...repos]
    .sort((a, b) => b.downloads - a.downloads)
    .slice(0, 8)
    .map((repo) => ({ label: repo.fullName, value: repo.downloads }));

  return (
    <Chrome
      login={login}
      nav="overview"
      onNav={(id) => {
        if (id === "repos") onOpenPicker();
      }}
      title="Overview"
      trailing={
        <>
          {fetched ? (
            <span className="mr-1 text-[12px] text-mist">
              {refreshing ? "Refreshing" : `Updated ${fetched}`}
            </span>
          ) : null}
          <Button onClick={onRefresh} disabled={refreshing}>
            <ArrowClockwise size={14} className={refreshing ? "animate-spin" : ""} />
            Refresh
          </Button>
          <Button variant="primary" onClick={onOpenPicker}>
            <Plus size={14} weight="bold" />
            Repos
          </Button>
        </>
      }
    >
      <div className="h-full min-h-0 overflow-auto px-5 pb-8">
        {banner ? (
          <div className="mb-4 border border-accent/40 px-3 py-2 text-[13px] text-accent-soft">
            {banner}
          </div>
        ) : null}

        <div className="card grid grid-cols-4 gap-6 px-5 py-4">
          <KpiCard label="Repos" value={repos.length} />
          <KpiCard label="Stars" value={stars} />
          <KpiCard label="Forks" value={forks} />
          <KpiCard label="Downloads" value={downloads} />
        </div>

        {repos.length === 0 ? (
          <div className="card mt-4 flex min-h-[280px] flex-col items-center justify-center px-8 text-center">
            <h2 className="text-[20px] font-semibold tracking-[-0.03em]">No repositories tracked</h2>
            <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-mist">
              Choose the repositories you want to watch. Only that set is tracked.
            </p>
            <Button variant="primary" className="mt-5" onClick={onOpenPicker}>
              <Plus size={14} weight="bold" />
              Repos
            </Button>
          </div>
        ) : (
          <>
            {chartItems.some((item) => item.value > 0) ? (
              <div className="card mt-4 p-5">
                <div className="mb-4 text-[13px] font-medium">Downloads by repo</div>
                <BarChart items={chartItems} />
              </div>
            ) : null}

            <div className="card mt-4 overflow-hidden">
              <div className="grid grid-cols-[minmax(0,1fr)_88px_88px_104px] gap-3 border-b border-line px-4 py-2 text-[11px] text-mist">
                <span>Repository</span>
                <span className="text-right">Stars</span>
                <span className="text-right">Forks</span>
                <span className="text-right">Downloads</span>
              </div>
              <ul>
                {repos.map((repo) => (
                  <li key={repo.fullName} className="border-b border-line last:border-b-0">
                    <button
                      type="button"
                      onClick={() => onOpenRepo(repo.fullName)}
                      className="grid w-full grid-cols-[minmax(0,1fr)_88px_88px_104px] items-center gap-3 px-4 py-3 text-left hover:bg-white/[0.03]"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-[13px] font-medium">{repo.fullName}</div>
                        <div className="mt-0.5 truncate text-[12px] text-mist">
                          {repo.error
                            ? repo.error
                            : [repo.language, repo.private ? "Private" : null]
                                .filter(Boolean)
                                .join(" · ") || repo.description || " "}
                        </div>
                      </div>
                      <span className="text-right text-[13px] tabular">{fmtNum(repo.stars)}</span>
                      <span className="text-right text-[13px] tabular">{fmtNum(repo.forks)}</span>
                      <span className="text-right text-[13px] tabular">{fmtNum(repo.downloads)}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </Chrome>
  );
}
