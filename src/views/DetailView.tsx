import { useState, type ReactNode } from "react";
import {
  ArrowLeft,
  CaretDown,
  DownloadSimple,
  Eye,
  GitFork,
  Star,
} from "@phosphor-icons/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Button } from "../components/Button";
import { Chrome } from "../components/Chrome";
import { fmtBytes, fmtDate, fmtNum, fmtRepoSizeKb } from "../lib/format";
import type { RepoDetail } from "../lib/types";

export function DetailView({
  login,
  loading,
  error,
  detail,
  onBack,
}: {
  login: string | null;
  loading: boolean;
  error: string | null;
  detail: RepoDetail | null;
  onBack: () => void;
}) {
  return (
    <Chrome
      login={login}
      trailing={
        <>
          {detail ? (
            <Button onClick={() => openUrl(`https://github.com/${detail.fullName}`)}>
              GitHub
            </Button>
          ) : null}
          <Button onClick={onBack}>
            <ArrowLeft size={14} />
            Back
          </Button>
        </>
      }
    >
      <div className="h-full min-h-0 overflow-auto">
        {loading ? (
          <div className="px-8 py-10 text-[14px] text-mist">Loading repository…</div>
        ) : error ? (
          <div className="px-8 py-10 text-[14px] text-star">{error}</div>
        ) : detail ? (
          <DetailBody detail={detail} />
        ) : null}
      </div>
    </Chrome>
  );
}

function DetailBody({ detail }: { detail: RepoDetail }) {
  const [openTag, setOpenTag] = useState<string | null>(
    detail.releases[0]?.tag ?? null,
  );

  const facts: [string, string][] = [
    ["Stars", fmtNum(detail.stars)],
    ["Forks", fmtNum(detail.forks)],
    ["Watchers", fmtNum(detail.watchers)],
    ["Open issues", fmtNum(detail.openIssues)],
    ["Network", fmtNum(detail.networkCount)],
    ["Downloads", fmtNum(detail.downloads)],
    ["Language", detail.language ?? "—"],
    ["License", detail.license ?? "—"],
    ["Default branch", detail.defaultBranch ?? "—"],
    ["Visibility", detail.visibility ?? (detail.private ? "private" : "public")],
    ["Size", fmtRepoSizeKb(detail.size)],
    ["Created", fmtDate(detail.createdAt)],
    ["Updated", fmtDate(detail.updatedAt)],
    ["Last push", fmtDate(detail.pushedAt)],
    ["Homepage", detail.homepage ?? "—"],
  ];

  return (
    <div className="px-8 py-7">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[28px] leading-tight font-semibold tracking-[-0.045em]">
            {detail.fullName}
          </h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {detail.private ? <Flag>Private</Flag> : <Flag>Public</Flag>}
            {detail.archived ? <Flag>Archived</Flag> : null}
            {detail.isTemplate ? <Flag>Template</Flag> : null}
          </div>
          {detail.description ? (
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-mist">
              {detail.description}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-5 font-mono text-[13px]">
          <span className="flex items-center gap-1.5 text-star">
            <Star size={13} /> {fmtNum(detail.stars)}
          </span>
          <span className="flex items-center gap-1.5">
            <GitFork size={13} className="text-mist" /> {fmtNum(detail.forks)}
          </span>
          <span className="flex items-center gap-1.5">
            <DownloadSimple size={13} className="text-mist" /> {fmtNum(detail.downloads)}
          </span>
        </div>
      </div>

      {detail.topics.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {detail.topics.map((topic) => (
            <span
              key={topic}
              className="rounded-md border border-line px-2 py-0.5 font-mono text-[11px] text-mist"
            >
              {topic}
            </span>
          ))}
        </div>
      ) : null}

      <dl className="mt-8 grid grid-cols-2 gap-x-10 gap-y-3 border-t border-line pt-6 sm:grid-cols-3 lg:grid-cols-4">
        {facts.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[11px] text-mist">{label}</dt>
            <dd className="mt-1 font-mono text-[13px] tabular">{value}</dd>
          </div>
        ))}
      </dl>

      <section className="mt-10">
        <h2 className="text-[16px] font-semibold tracking-[-0.03em]">Traffic, 14 days</h2>
        {detail.trafficError && !detail.views && !detail.clones ? (
          <p className="mt-3 text-[13px] leading-relaxed text-mist">
            Views and clones need push access. {detail.trafficError}
          </p>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-8">
            <TrafficBlock
              label="Views"
              traffic={detail.views}
              icon={<Eye size={14} />}
            />
            <TrafficBlock
              label="Clones"
              traffic={detail.clones}
              icon={<DownloadSimple size={14} />}
            />
          </div>
        )}
      </section>

      {detail.languages.length > 0 ? (
        <section className="mt-10">
          <h2 className="text-[16px] font-semibold tracking-[-0.03em]">Languages</h2>
          <ul className="mt-4 space-y-2">
            {detail.languages.map((lang) => {
              const total = detail.languages.reduce((s, l) => s + l.bytes, 0) || 1;
              const pct = (lang.bytes / total) * 100;
              return (
                <li key={lang.name} className="grid grid-cols-[140px_1fr_64px] items-center gap-3">
                  <span className="truncate text-[13px]">{lang.name}</span>
                  <div className="h-[3px] overflow-hidden rounded-full bg-line">
                    <div
                      className="h-full bg-star"
                      style={{ width: `${Math.max(pct, 1.5)}%` }}
                    />
                  </div>
                  <span className="text-right font-mono text-[11px] text-mist tabular">
                    {pct < 1 ? "<1" : pct.toFixed(0)}%
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      <section className="mt-10 pb-8">
        <h2 className="text-[16px] font-semibold tracking-[-0.03em]">
          Releases
          <span className="ml-2 font-mono text-[12px] font-normal text-mist">
            {fmtNum(detail.releases.length)}
          </span>
        </h2>
        {detail.releases.length === 0 ? (
          <p className="mt-3 text-[13px] text-mist">No releases published.</p>
        ) : (
          <ul className="mt-4 divide-y divide-line border-t border-b border-line">
            {detail.releases.map((release) => {
              const open = openTag === release.tag;
              return (
                <li key={release.tag}>
                  <button
                    type="button"
                    onClick={() => setOpenTag(open ? null : release.tag)}
                    className="flex w-full items-center gap-4 py-3 text-left hover:bg-white/[0.02]"
                  >
                    <CaretDown
                      size={12}
                      className={`text-mist transition-transform ${open ? "" : "-rotate-90"}`}
                    />
                    <span className="font-mono text-[13px] text-star">{release.tag}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-mist">
                      {release.name && release.name !== release.tag ? release.name : ""}
                    </span>
                    {release.draft ? <Flag>Draft</Flag> : null}
                    {release.prerelease ? <Flag>Pre</Flag> : null}
                    <span className="text-[12px] text-mist">{fmtDate(release.publishedAt)}</span>
                    <span className="w-24 text-right font-mono text-[13px] tabular">
                      {fmtNum(release.downloads)}
                    </span>
                  </button>
                  {open ? (
                    <ul className="pb-3 pl-9">
                      {release.assets.length === 0 ? (
                        <li className="py-1 text-[12px] text-mist">No assets</li>
                      ) : (
                        release.assets.map((asset) => (
                          <li
                            key={asset.name}
                            className="grid grid-cols-[minmax(0,1fr)_88px_72px] gap-3 py-1.5 font-mono text-[12px]"
                          >
                            <span className="truncate text-paper">{asset.name}</span>
                            <span className="text-right text-mist">{fmtBytes(asset.size)}</span>
                            <span className="text-right tabular">{fmtNum(asset.downloadCount)}</span>
                          </li>
                        ))
                      )}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Flag({ children }: { children: string }) {
  return (
    <span className="rounded-md border border-line px-1.5 py-0.5 font-mono text-[10px] text-mist">
      {children}
    </span>
  );
}

function TrafficBlock({
  label,
  traffic,
  icon,
}: {
  label: string;
  traffic: RepoDetail["views"];
  icon: ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[12px] text-mist">
        {icon}
        {label}
      </div>
      {traffic ? (
        <div className="mt-2 flex items-baseline gap-3">
          <span className="font-mono text-[22px] tracking-[-0.03em] tabular">
            {fmtNum(traffic.count)}
          </span>
          <span className="font-mono text-[12px] text-mist">
            {fmtNum(traffic.uniques)} unique
          </span>
        </div>
      ) : (
        <p className="mt-2 text-[13px] text-mist">Unavailable</p>
      )}
    </div>
  );
}
