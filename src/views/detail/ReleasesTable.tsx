import { CaretDown } from "@phosphor-icons/react";
import { useState } from "react";
import { BarChart } from "../../components/Charts";
import { fmtBytes, fmtCompact, fmtDate, fmtNum } from "../../lib/format";
import type { RepoDetail } from "../../lib/types";
import { Flag } from "./shared";

export function ReleasesTable({ detail }: { detail: RepoDetail }) {
  const [openTag, setOpenTag] = useState<string | null>(
    detail.releases[0]?.tag ?? null,
  );

  return (
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
        <p className="px-5 py-6 text-center text-[13px] text-faint">
          No releases published.
        </p>
      ) : (
        <ul>
          {detail.releases.map((release) => {
            const open = openTag === release.tag;
            return (
              <li
                key={release.tag}
                className="border-b border-hairline last:border-b-0"
              >
                <button
                  type="button"
                  onClick={() => setOpenTag(open ? null : release.tag)}
                  className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-hover"
                >
                  <CaretDown
                    size={12}
                    className={`text-faint transition-transform ${open ? "" : "-rotate-90"}`}
                  />
                  <span className="font-mono text-[13px] text-paper">
                    {release.tag}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-mist">
                    {release.name && release.name !== release.tag
                      ? release.name
                      : ""}
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
                          <span className="text-right text-faint">
                            {fmtBytes(asset.size)}
                          </span>
                          <span className="text-right tabular">
                            {fmtNum(asset.downloadCount)}
                          </span>
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
  );
}
