import type { ReactNode } from "react";
import { useI18n } from "../../app/hooks";
import { fmtDate, fmtNum, fmtRepoSizeKb } from "../../lib/format";
import type { RepoDetail } from "../../lib/types";
import { HomepageValue } from "./shared";

export function MetaFacts({ detail }: { detail: RepoDetail }) {
  const { t } = useI18n();
  const facts: [string, ReactNode][] = [
    [t("Language"), detail.language ?? "—"],
    [t("License"), detail.license ?? "—"],
    [t("Default branch"), detail.defaultBranch ?? "—"],
    [t("Size"), fmtRepoSizeKb(detail.size)],
    [t("Network"), fmtNum(detail.networkCount)],
    [t("Created"), fmtDate(detail.createdAt)],
    [t("Updated"), fmtDate(detail.updatedAt)],
    [t("Last push"), fmtDate(detail.pushedAt)],
    [t("Open issues"), fmtNum(detail.openIssues)],
  ];

  return (
    <div className="card mt-3 p-4">
      <div className="text-[13px] font-semibold">{t("Details")}</div>
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
            {t("Homepage")}
          </dt>
          <dd className="mt-1 font-mono text-[12.5px]">
            <HomepageValue value={detail.homepage} />
          </dd>
        </div>
      </dl>
    </div>
  );
}
