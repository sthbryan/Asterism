import { useState, type ReactNode } from "react";
import {
  ArrowSquareOut,
  CaretDown,
  CaretLeft,
  DownloadSimple,
  Eye,
  GitFork,
  Globe,
  LockSimple,
  Star,
  WarningCircle,
} from "@phosphor-icons/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { AreaChart, BarChart, ColumnChart } from "../components/Charts";
import { Chrome } from "../components/Chrome";
import { KpiCard } from "../components/KpiCard";
import { DetailSkeleton } from "../components/Skeleton";
import {
  fmtBytes,
  fmtCompact,
  fmtDate,
  fmtNum,
  fmtRepoSizeKb,
  hrefFromMaybeUrl,
} from "../lib/format";
import { langColor } from "../lib/langcolors";
import { platformItems, shortPath } from "../lib/platform";
import { fillTrafficDays, pickKpiDelta, windowDelta } from "../lib/series";
import type { RepoDetail } from "../lib/types";

export function DetailView({
  login,
  loading,
  error,
  detail,
  trackedCount,
  onBack,
  onOpenPicker,
}: {
  login: string | null;
  loading: boolean;
  error: string | null;
  detail: RepoDetail | null;
  trackedCount?: number;
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
      trackedCount={trackedCount}
      title={
        <nav className="flex items-center gap-2 text-[13px]">
          <button
            type="button"
            onClick={onBack}
            className="-ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium text-mist transition-colors hover:bg-white/[0.04] hover:text-paper"
          >
            <CaretLeft size={13} />
            Overview
          </button>
          <span className="text-faint">/</span>
          <span className="font-mono text-[13px] font-semibold">{detail?.fullName ?? "…"}</span>
        </nav>
      }
      trailing={
        detail ? (
          <button
            type="button"
            onClick={() => {
              void openUrl(`https://github.com/${detail.fullName}`);
            }}
            className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12.5px] font-medium text-mist transition-colors hover:bg-white/[0.06] hover:text-paper"
          >
            GitHub
            <ArrowSquareOut size={12} />
          </button>
        ) : null
      }
    >
      {loading ? (
        <DetailSkeleton />
      ) : (
        <div className="h-full min-h-0 overflow-auto px-6 pt-5 pb-6">
          {error ? (
            <div className="card flex items-start gap-3 p-5 text-[14px] text-accent-soft">
              <WarningCircle size={16} />
              {error}
            </div>
          ) : detail ? (
            <DetailBody detail={detail} />
          ) : null}
        </div>
      )}
    </Chrome>
  );
}

function DetailBody({ detail }: { detail: RepoDetail }) {
  const [openTag, setOpenTag] = useState<string | null>(detail.releases[0]?.tag ?? null);
  const langTotal = detail.languages.reduce((sum, lang) => sum + lang.bytes, 0) || 1;
  const starKpi = pickKpiDelta(windowDelta(detail.starHistory ?? [], 7), null);
  const downloadKpi = pickKpiDelta(windowDelta(detail.downloadHistory ?? [], 7), null);
  const platformBars = platformItems(
    detail.platforms ?? { macos: 0, windows: 0, linux: 0, other: 0 },
  );
  const referrers = [...(detail.referrers ?? [])].slice(0, 8);
  const paths = [...(detail.paths ?? [])].slice(0, 8);
  const facts: [string, ReactNode][] = [
    ["Language", detail.language ?? "—"],
    ["License", detail.license ?? "—"],
    ["Default branch", detail.defaultBranch ?? "—"],
    ["Size", fmtRepoSizeKb(detail.size)],
    ["Network", fmtNum(detail.networkCount)],
    ["Created", fmtDate(detail.createdAt)],
    ["Updated", fmtDate(detail.updatedAt)],
    ["Last push", fmtDate(detail.pushedAt)],
    ["Open issues", fmtNum(detail.openIssues)],
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[11px] leading-none font-medium text-accent-soft">
          {detail.private ? <LockSimple size={11} /> : <Globe size={12} />}
          {detail.private ? "Private" : "Public"}
        </span>
        {detail.archived ? <Flag>Archived</Flag> : null}
        {detail.isTemplate ? <Flag>Template</Flag> : null}
      </div>
      {detail.description ? (
        <p className="mt-2.5 max-w-3xl text-[13px] leading-relaxed text-mist">
          {detail.description}
        </p>
      ) : null}
      {detail.topics.length > 0 ? (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {detail.topics.map((topic) => (
            <span
              key={topic}
              className="rounded-md border border-hairline bg-white/[0.02] px-1.5 py-0.5 font-mono text-[11px] text-mist"
            >
              #{topic}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-5 grid grid-cols-4 gap-3">
        <KpiCard
          label="Stars"
          value={detail.stars}
          icon={<Star size={15} />}
          sub="total"
          delta={starKpi?.delta}
          deltaHint={starKpi?.hint}
        />
        <KpiCard label="Forks" value={detail.forks} icon={<GitFork size={15} />} sub="total" />
        <KpiCard label="Watchers" value={detail.watchers} icon={<Eye size={15} />} sub="total" />
        <KpiCard
          label="Downloads"
          value={detail.downloads}
          icon={<DownloadSimple size={15} />}
          sub="release assets"
          hero
          delta={downloadKpi?.delta}
          deltaHint={downloadKpi?.hint}
        />
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="card p-4">
          <div className="text-[13px] font-semibold">Stars over time</div>
          <p className="mt-1 text-[11.5px] leading-snug text-faint">
            Reconstructed from GitHub stargazers, then kept in sync on each refresh.
          </p>
          <div className="mt-3">
            <AreaChart
              points={detail.starHistory ?? []}
              tone="paper"
              empty="No stars yet, so there is nothing to plot."
            />
          </div>
        </div>
        <div className="card p-4">
          <div className="text-[13px] font-semibold">Downloads over time</div>
          <p className="mt-1 text-[11.5px] leading-snug text-faint">
            GitHub only reports current totals. Asterism snapshots them so the series grows from here.
          </p>
          <div className="mt-3">
            <AreaChart
              points={detail.downloadHistory ?? []}
              tone="accent"
              empty="No download snapshots yet. Refresh to take the first point."
            />
          </div>
        </div>
      </div>

      <div className="card mt-3 p-4">
          <div className="flex items-baseline justify-between gap-3">
            <div className="text-[13px] font-semibold">Traffic · 14 days</div>
            <span className="text-[11px] text-faint">GitHub only exposes the last 14 days</span>
          </div>
          {detail.trafficError && !detail.views && !detail.clones ? (
            <p className="mt-3 text-[13px] leading-relaxed text-mist">
              Views and clones require push access. {detail.trafficError}
            </p>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-5">
              <div>
                <TrafficBlock label="Views" icon={<Eye size={14} />} traffic={detail.views} unique="unique" />
                <div className="mt-3">
                  <ColumnChart
                    tone="paper"
                    items={fillTrafficDays(detail.views?.days).map((day) => ({
                      ts: day.ts,
                      value: day.count,
                      hint: `${fmtNum(day.uniques)} unique`,
                    }))}
                    empty="No view samples."
                  />
                </div>
              </div>
              <div>
                <TrafficBlock
                  label="Clones"
                  icon={<DownloadSimple size={14} />}
                  traffic={detail.clones}
                  unique="unique"
                />
                <div className="mt-3">
                  <ColumnChart
                    tone="accent"
                    items={fillTrafficDays(detail.clones?.days).map((day) => ({
                      ts: day.ts,
                      value: day.count,
                      hint: `${fmtNum(day.uniques)} unique`,
                    }))}
                    empty="No clone samples."
                  />
                </div>
              </div>
            </div>
          )}
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="card p-4">
          <div className="text-[13px] font-semibold">Referrers · 14 days</div>
          {referrers.length === 0 ? (
            <p className="mt-3 text-[13px] text-faint">
              {detail.trafficError && !detail.views
                ? "Referrers need push access, same as views."
                : "No referrers in the last 14 days."}
            </p>
          ) : (
            <div className="mt-3">
              <BarChart
                items={referrers.map((row) => ({
                  label: row.referrer,
                  value: row.count,
                }))}
              />
            </div>
          )}
        </div>
        <div className="card p-4">
          <div className="text-[13px] font-semibold">Popular paths · 14 days</div>
          {paths.length === 0 ? (
            <p className="mt-3 text-[13px] text-faint">
              {detail.trafficError && !detail.views
                ? "Paths need push access, same as views."
                : "No popular paths in the last 14 days."}
            </p>
          ) : (
            <div className="mt-3">
              <BarChart
                items={paths.map((row) => ({
                  label: shortPath(row.path, detail.fullName),
                  value: row.count,
                }))}
                onSelect={(label) => {
                  const match = paths.find(
                    (row) => shortPath(row.path, detail.fullName) === label,
                  );
                  if (match) void openUrl(`https://github.com${match.path}`);
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="card p-4">
          <div className="text-[13px] font-semibold">Downloads by platform</div>
          {platformBars.length === 0 ? (
            <p className="mt-3 text-[13px] text-faint">
              No release assets with a recognizable platform.
            </p>
          ) : (
            <div className="mt-3">
              <BarChart items={platformBars} />
            </div>
          )}
        </div>
        <div className="card p-4">
          <div className="text-[13px] font-semibold">Languages</div>
          {detail.languages.length === 0 ? (
            <p className="mt-3 text-[13px] text-faint">No language data.</p>
          ) : (
            <ul className="mt-3.5 space-y-2">
              {detail.languages.map((lang) => {
                const pct = (lang.bytes / langTotal) * 100;
                return (
                  <li key={lang.name} className="grid grid-cols-[100px_1fr_40px] items-center gap-2.5">
                    <span className="flex min-w-0 items-center gap-1.5 text-[12.5px]">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: langColor(lang.name) }}
                      />
                      <span className="truncate">{lang.name}</span>
                    </span>
                    <span className="block h-1.5 overflow-hidden rounded-full bg-raised">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${Math.max(pct, 2)}%`,
                          background: langColor(lang.name),
                        }}
                      />
                    </span>
                    <span className="text-right font-mono text-[11.5px] text-mist tabular">
                      {pct < 1 ? "<1%" : `${Math.round(pct)}%`}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="card mt-3 p-4">
        <div className="text-[13px] font-semibold">Details</div>
        <dl className="mt-3.5 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
          {facts.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="font-mono text-[10px] tracking-[0.08em] uppercase text-faint">
                {label}
              </dt>
              <dd className="mt-1 truncate font-mono text-[12.5px] tabular">{value}</dd>
            </div>
          ))}
          <div className="min-w-0 sm:col-span-2">
            <dt className="font-mono text-[10px] tracking-[0.08em] uppercase text-faint">
              Homepage
            </dt>
            <dd className="mt-1 font-mono text-[12.5px]">
              <HomepageValue value={detail.homepage} />
            </dd>
          </div>
        </dl>
      </div>

      <div className="card mt-3 overflow-hidden">
        <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5">
          <div className="text-[13px] font-semibold">Releases</div>
          <span className="font-mono text-[11.5px] text-faint tabular">
            {fmtNum(detail.releases.length)}
          </span>
        </div>
        {detail.releases.some((release) => release.downloads > 0) ? (
          <div className="border-b border-hairline px-4 py-3">
            <BarChart
              items={[...detail.releases]
                .sort((a, b) => b.downloads - a.downloads)
                .slice(0, 8)
                .map((release) => ({
                  label: release.tag,
                  value: release.downloads,
                }))}
            />
          </div>
        ) : null}
        {detail.releases.length === 0 ? (
          <p className="px-5 py-6 text-center text-[13px] text-faint">No releases published.</p>
        ) : (
          <ul>
            {detail.releases.map((release) => {
              const open = openTag === release.tag;
              return (
                <li key={release.tag} className="border-b border-hairline last:border-b-0">
                  <button
                    type="button"
                    onClick={() => setOpenTag(open ? null : release.tag)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
                  >
                    <CaretDown
                      size={12}
                      className={`text-faint transition-transform ${open ? "" : "-rotate-90"}`}
                    />
                    <span className="font-mono text-[13px] text-paper">{release.tag}</span>
                    <span className="min-w-0 flex-1 truncate text-[13px] text-mist">
                      {release.name && release.name !== release.tag ? release.name : ""}
                    </span>
                    {release.draft ? <Flag>Draft</Flag> : null}
                    {release.prerelease ? <Flag>Pre</Flag> : null}
                    <span className="font-mono text-[12px] text-faint">
                      {fmtDate(release.publishedAt)}
                    </span>
                    <span className="w-16 text-right text-[13px] font-medium tabular">
                      {fmtCompact(release.downloads)}
                    </span>
                  </button>
                  {open ? (
                    <ul className="pr-4 pb-3.5 pl-10">
                      {release.assets.length === 0 ? (
                        <li className="py-1 text-[12px] text-faint">No assets</li>
                      ) : (
                        release.assets.map((asset) => (
                          <li
                            key={asset.name}
                            className="grid grid-cols-[minmax(0,1fr)_96px_72px] gap-3 border-t border-hairline py-1.5 font-mono text-[11.5px] first:border-t-0"
                          >
                            <span className="truncate">{asset.name}</span>
                            <span className="text-right text-faint">{fmtBytes(asset.size)}</span>
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

function HomepageValue({ value }: { value: string | null }) {
  if (!value) return "—";
  const href = hrefFromMaybeUrl(value);
  if (!href) return value;
  return (
    <button
      type="button"
      title={href}
      onClick={() => {
        void openUrl(href);
      }}
      className="inline-flex max-w-full items-center gap-1 text-left text-accent-soft hover:underline"
    >
      <span className="truncate">{value}</span>
      <ArrowSquareOut size={11} className="shrink-0" />
    </button>
  );
}

function Flag({ children }: { children: string }) {
  return (
    <span className="shrink-0 rounded-md border border-line px-1.5 py-px font-mono text-[10px] tracking-wide uppercase text-mist">
      {children}
    </span>
  );
}

function TrafficBlock({
  label,
  icon,
  traffic,
  unique,
}: {
  label: string;
  icon: ReactNode;
  traffic: RepoDetail["views"];
  unique: string;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 text-mist">
        <span className="text-faint">{icon}</span>
        <span className="kpi-label">{label}</span>
      </div>
      {traffic ? (
        <div className="mt-2.5">
          <div className="font-mono text-[18px] leading-none font-semibold tabular">
            {fmtCompact(traffic.count)}
          </div>
          <div className="mt-1.5 text-[12px] leading-none text-faint">
            {fmtNum(traffic.uniques)} {unique}
          </div>
        </div>
      ) : (
        <p className="mt-2.5 text-[13px] text-faint">Unavailable</p>
      )}
    </div>
  );
}
