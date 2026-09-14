import type { ReactNode } from "react";
import { fmtDate, fmtNum, fmtRepoSizeKb } from "../../lib/format";
import type { RepoDetail } from "../../lib/types";
import { HomepageValue } from "./shared";

export function MetaFacts({ detail }: { detail: RepoDetail }) {
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
    <div className="card mt-3 p-4">
      <div className="text-[13px] font-semibold">Details</div>
      <dl className="mt-3.5 grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-5">
        {facts.map(([label, value]) => (
          <div key={label} className="min-w-0">
            <dt className="font-mono text-[10px] tracking-[0.08em] uppercase text-faint">
              {label}
            </dt>
            <dd className="mt-1 truncate font-mono text-[12.5px] tabular">
              {value}
            </dd>
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
  );
}
