import {
  ArrowClockwise,
  DownloadSimple,
  Folders,
  GitFork,
  Plus,
  Star,
} from "@phosphor-icons/react";
import { BarChart, Donut } from "../components/Charts";
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
      <div className="h-full min-h-0 overflow-auto px-6 pb-8">
        {banner ? (
          <div className="mb-4 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-[13px] text-accent-soft">
            {banner}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <KpiCard label="Repos" value={repos.length} icon={<Folders size={16} />} hint="Tracked" />
          <KpiCard label="Stars" value={stars} icon={<Star size={16} weight="fill" />} tone="accent" />
          <KpiCard label="Forks" value={forks} icon={<GitFork size={16} />} tone="cyan" />
          <KpiCard
            label="Downloads"
            value={downloads}
            icon={<DownloadSimple size={16} />}
            tone="amber"
          />
        </div>

        {repos.length === 0 ? (
          <div className="card mt-5 flex min-h-[360px] flex-col items-center justify-center px-10 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-accent/15 text-accent-soft">
              <Star size={26} weight="fill" />
            </span>
            <h2 className="mt-5 text-[24px] font-semibold tracking-[-0.04em]">
              Pick the stars you care about
            </h2>
            <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-mist">
              Only the repositories you mark are tracked. Stars, forks, and release downloads show up here.
            </p>
            <Button variant="primary" className="mt-6" onClick={onOpenPicker}>
              <Plus size={14} weight="bold" />
              Repos
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
              <div className="card p-5">
                <div className="mb-4 text-[15px] font-semibold tracking-[-0.02em]">
                  Downloads by repo
                </div>
                {chartItems.some((item) => item.value > 0) ? (
                  <BarChart items={chartItems} />
                ) : (
                  <p className="py-10 text-[13px] text-mist">No release downloads yet.</p>
                )}
              </div>
              <div className="card p-5">
                <div className="mb-4 text-[15px] font-semibold tracking-[-0.02em]">Share</div>
                {chartItems.some((item) => item.value > 0) ? (
                  <Donut items={chartItems} />
                ) : (
                  <p className="py-10 text-[13px] text-mist">Nothing to split yet.</p>
                )}
              </div>
            </div>

            <div className="mt-6 mb-3 text-[15px] font-semibold tracking-[-0.02em]">
              Tracked repositories
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {repos.map((repo) => (
                <button
                  key={repo.fullName}
                  type="button"
                  onClick={() => onOpenRepo(repo.fullName)}
                  className="card p-5 text-left transition-colors hover:border-accent/40 hover:bg-white/[0.03]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-[15px] font-semibold tracking-[-0.02em]">
                        {repo.fullName}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {repo.language ? <Pill>{repo.language}</Pill> : null}
                        {repo.private ? <Pill>Private</Pill> : null}
                      </div>
                    </div>
                  </div>
                  {repo.error ? (
                    <p className="mt-3 truncate text-[12px] text-amber">{repo.error}</p>
                  ) : repo.description ? (
                    <p className="mt-3 line-clamp-2 text-[13px] leading-relaxed text-mist">
                      {repo.description}
                    </p>
                  ) : (
                    <p className="mt-3 text-[13px] text-mist">No description</p>
                  )}
                  <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/5 pt-4">
                    <MiniStat label="Stars" value={repo.stars} />
                    <MiniStat label="Forks" value={repo.forks} />
                    <MiniStat label="Downloads" value={repo.downloads} />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </Chrome>
  );
}

function Pill({ children }: { children: string }) {
  return (
    <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-mist">
      {children}
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[11px] text-mist">{label}</div>
      <div className="mt-0.5 text-[14px] font-medium tabular">{fmtNum(value)}</div>
    </div>
  );
}
