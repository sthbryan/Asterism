import type { ReactNode } from "react";
import {
  ArrowClockwise,
  CaretRight,
  DownloadSimple,
  GitFork,
  Plus,
  Star,
} from "@phosphor-icons/react";
import { Button } from "../components/Button";
import { Chrome } from "../components/Chrome";
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

  return (
    <Chrome
      login={login}
      trailing={
        <>
          {fetched ? (
            <span className="mr-1 font-mono text-[11px] text-mist">
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
      <div className="flex h-full min-h-0 flex-col">
        {banner ? (
          <div className="border-b border-line px-6 py-2 text-[13px] text-star">{banner}</div>
        ) : null}
        {repos.length === 0 ? (
          <div className="flex flex-1 items-center justify-center px-10">
            <div className="max-w-sm">
              <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.04em]">
                No stars picked yet
              </h1>
              <p className="mt-3 text-[15px] leading-relaxed text-mist">
                Choose the repositories you want to watch. Only that set is tracked.
              </p>
              <Button variant="primary" className="mt-6" onClick={onOpenPicker}>
                <Plus size={14} weight="bold" />
                Repos
              </Button>
            </div>
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-auto">
            <div className="grid grid-cols-[minmax(0,1fr)_92px_92px_112px_76px] items-center gap-x-4 border-b border-line px-6 py-2 font-mono text-[11px] text-mist">
              <span>Repository</span>
              <span className="text-right">Stars</span>
              <span className="text-right">Forks</span>
              <span className="text-right">Downloads</span>
              <span />
            </div>
            <ul>
              {repos.map((repo) => (
                <li key={repo.fullName} className="border-b border-line/70">
                  <div className="grid grid-cols-[minmax(0,1fr)_92px_92px_112px_76px] items-center gap-x-4 px-6 py-3.5 hover:bg-white/[0.025]">
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-medium tracking-[-0.02em]">
                        {repo.fullName}
                      </div>
                      <div className="mt-0.5 flex min-w-0 items-center gap-2 text-[12px] text-mist">
                        {repo.language ? <span>{repo.language}</span> : null}
                        {repo.private ? <span>Private</span> : null}
                        {repo.error ? (
                          <span className="truncate text-star">{repo.error}</span>
                        ) : repo.description ? (
                          <span className="truncate">{repo.description}</span>
                        ) : null}
                      </div>
                    </div>
                    <Stat icon={<Star size={12} />} value={repo.stars} accent />
                    <Stat icon={<GitFork size={12} />} value={repo.forks} />
                    <Stat icon={<DownloadSimple size={12} />} value={repo.downloads} />
                    <div className="flex justify-end">
                      <Button
                        variant="quiet"
                        className="px-2"
                        onClick={() => onOpenRepo(repo.fullName)}
                      >
                        View
                        <CaretRight size={12} />
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Chrome>
  );
}

function Stat({
  icon,
  value,
  accent = false,
}: {
  icon: ReactNode;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-end gap-1.5 font-mono text-[13px] tabular ${
        accent ? "text-star" : "text-paper"
      }`}
    >
      <span className={accent ? "text-star-dim" : "text-mist"}>{icon}</span>
      {fmtNum(value)}
    </div>
  );
}
