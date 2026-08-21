import { useState } from "react";
import {
  ArrowLeft,
  CaretDown,
  DownloadSimple,
  Eye,
  GitFork,
  Star,
  WarningCircle,
} from "@phosphor-icons/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Button } from "../components/Button";
import { Chrome } from "../components/Chrome";
import { KpiCard } from "../components/KpiCard";
import { fmtBytes, fmtCompact, fmtDate, fmtNum, fmtRepoSizeKb } from "../lib/format";
import type { RepoDetail } from "../lib/types";

export function DetailView({
  login,
  loading,
  error,
  detail,
  onBack,
  onOpenPicker,
}: {
  login: string | null;
  loading: boolean;
  error: string | null;
  detail: RepoDetail | null;
  onBack: () => void;
  onOpenPicker: () => void;
}) {
  return (
    <Chrome
      login={login}
      nav="overview"
      onNav={(id) => {
        if (id === "overview") onBack();
        if (id === "repos") onOpenPicker();
      }}
      title={detail?.fullName ?? "Repository"}
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
      <div className="h-full min-h-0 overflow-auto px-6 pb-8">
        {loading ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card h-28 animate-pulse bg-panel" />
            ))}
          </div>
        ) : error ? (
          <div className="card flex items-start gap-3 p-6 text-[14px] text-amber">
            <WarningCircle size={18} />
            {error}
          </div>
        ) : detail ? (
          <DetailBody detail={detail} />
        ) : null}
      </div>
    </Chrome>
  );
}

function DetailBody({ detail }: { detail: RepoDetail }) {
  const [openTag, setOpenTag] = useState<string | null>(detail.releases[0]?.tag ?? null);
  const langTotal = detail.languages.reduce((sum, lang) => sum + lang.bytes, 0) || 1;
  const facts: [string, string][] = [
    ["Language", detail.language ?? "—"],
    ["License", detail.license ?? "—"],
    ["Default branch", detail.defaultBranch ?? "—"],
    ["Visibility", detail.visibility ?? (detail.private ? "private" : "public")],
    ["Size", fmtRepoSizeKb(detail.size)],
    ["Network", fmtNum(detail.networkCount)],
    ["Created", fmtDate(detail.createdAt)],
    ["Updated", fmtDate(detail.updatedAt)],
    ["Last push", fmtDate(detail.pushedAt)],
    ["Homepage", detail.homepage ?? "—"],
  ];

  return (
    <div>
      {detail.description ? (
        <p className="mb-5 max-w-3xl text-[14px] leading-relaxed text-mist">{detail.description}</p>
      ) : null}
      <div className="mb-5 flex flex-wrap gap-1.5">
        {detail.private ? <Flag>Private</Flag> : <Flag>Public</Flag>}
        {detail.archived ? <Flag>Archived</Flag> : null}
        {detail.isTemplate ? <Flag>Template</Flag> : null}
        {detail.topics.map((topic) => (
          <Flag key={topic}>{topic}</Flag>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Stars" value={detail.stars} icon={<Star size={16} weight="fill" />} />
        <KpiCard label="Forks" value={detail.forks} icon={<GitFork size={16} />} tone="cyan" />
        <KpiCard
          label="Watchers"
          value={detail.watchers}
          icon={<Eye size={16} />}
          tone="rose"
        />
        <KpiCard
          label="Downloads"
          value={detail.downloads}
          icon={<DownloadSimple size={16} />}
          tone="amber"
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <div className="text-[15px] font-semibold tracking-[-0.02em]">Traffic, 14 days</div>
          {detail.trafficError && !detail.views && !detail.clones ? (
            <p className="mt-3 text-[13px] leading-relaxed text-mist">
              Views and clones need push access. {detail.trafficError}
            </p>
          ) : (
            <div className="mt-5 grid grid-cols-2 gap-4">
              <TrafficBlock label="Views" traffic={detail.views} />
              <TrafficBlock label="Clones" traffic={detail.clones} />
            </div>
          )}
        </div>
        <div className="card p-5">
          <div className="text-[15px] font-semibold tracking-[-0.02em]">Languages</div>
          {detail.languages.length === 0 ? (
            <p className="mt-3 text-[13px] text-mist">No language data.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {detail.languages.map((lang, i) => {
                const pct = (lang.bytes / langTotal) * 100;
                const colors = ["#7c6fff", "#4fd1c5", "#f0b429", "#f472b6", "#60a5fa"];
                return (
                  <li key={lang.name}>
                    <div className="mb-1 flex justify-between text-[12px]">
                      <span>{lang.name}</span>
                      <span className="font-mono text-mist tabular">
                        {pct < 1 ? "<1" : pct.toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.max(pct, 2)}%`,
                          background: colors[i % colors.length],
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="card mt-4 p-5">
        <div className="text-[15px] font-semibold tracking-[-0.02em]">Details</div>
        <dl className="mt-4 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="text-[11px] text-mist">{label}</dt>
              <dd className="mt-1 truncate text-[13px] tabular">{value}</dd>
            </div>
          ))}
          <div>
            <dt className="text-[11px] text-mist">Open issues</dt>
            <dd className="mt-1 text-[13px] tabular">{fmtNum(detail.openIssues)}</dd>
          </div>
        </dl>
      </div>

      <div className="card mt-4 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4">
          <div className="text-[15px] font-semibold tracking-[-0.02em]">Releases</div>
          <span className="text-[12px] text-mist">{fmtNum(detail.releases.length)}</span>
        </div>
        {detail.releases.length === 0 ? (
          <p className="px-5 pb-5 text-[13px] text-mist">No releases published.</p>
        ) : (
          <ul>
            {detail.releases.map((release) => {
              const open = openTag === release.tag;
              return (
                <li key={release.tag} className="border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setOpenTag(open ? null : release.tag)}
                    className="flex w-full items-center gap-3 px-5 py-3.5 text-left hover:bg-white/[0.03]"
                  >
                    <CaretDown
                      size={12}
                      className={`text-mist transition-transform ${open ? "" : "-rotate-90"}`}
                    />
                    <span className="font-mono text-[13px] text-accent-soft">{release.tag}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-mist">
                      {release.name && release.name !== release.tag ? release.name : ""}
                    </span>
                    {release.draft ? <Flag>Draft</Flag> : null}
                    {release.prerelease ? <Flag>Pre</Flag> : null}
                    <span className="text-[12px] text-mist">{fmtDate(release.publishedAt)}</span>
                    <span className="w-20 text-right text-[13px] font-medium tabular">
                      {fmtCompact(release.downloads)}
                    </span>
                  </button>
                  {open ? (
                    <ul className="px-5 pb-4 pl-12">
                      {release.assets.length === 0 ? (
                        <li className="py-1 text-[12px] text-mist">No assets</li>
                      ) : (
                        release.assets.map((asset) => (
                          <li
                            key={asset.name}
                            className="grid grid-cols-[minmax(0,1fr)_88px_72px] gap-3 py-1.5 text-[12px]"
                          >
                            <span className="truncate">{asset.name}</span>
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
      </div>
    </div>
  );
}

function Flag({ children }: { children: string }) {
  return (
    <span className="rounded-full bg-white/[0.06] px-2.5 py-0.5 text-[11px] text-mist">
      {children}
    </span>
  );
}

function TrafficBlock({
  label,
  traffic,
}: {
  label: string;
  traffic: RepoDetail["views"];
}) {
  return (
    <div className="rounded-2xl bg-white/[0.03] p-4">
      <div className="text-[12px] text-mist">{label}</div>
      {traffic ? (
        <div className="mt-2">
          <div className="text-[22px] font-semibold tracking-[-0.03em] tabular">
            {fmtCompact(traffic.count)}
          </div>
          <div className="mt-1 text-[12px] text-mist">{fmtNum(traffic.uniques)} unique</div>
        </div>
      ) : (
        <p className="mt-2 text-[13px] text-mist">Unavailable</p>
      )}
    </div>
  );
}
