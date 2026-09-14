import { openUrl } from "@tauri-apps/plugin-opener";
import { BarChart } from "../../components/Charts";
import { langColor } from "../../lib/langcolors";
import { platformItems, shortPath } from "../../lib/platform";
import type { RepoDetail } from "../../lib/types";

export function InsightsSection({ detail }: { detail: RepoDetail }) {
  const langTotal = detail.languages.reduce((sum, lang) => sum + lang.bytes, 0) || 1;
  const platformBars = platformItems(
    detail.platforms ?? { macos: 0, windows: 0, linux: 0, other: 0 },
  );
  const referrers = [...(detail.referrers ?? [])].slice(0, 8);
  const paths = [...(detail.paths ?? [])].slice(0, 8);

  return (
    <>
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
    </>
  );
}
