import { Badge, Collapsible } from "@zovaris/sephiro";
import { useState } from "react";
import { Else, If, Then, When } from "react-if";
import { useI18n } from "@/app/hooks";
import { BarList } from "@/components/BarList";
import { fmtBytes, fmtCompact, fmtDate, fmtNum } from "@/lib/format";
import type { RepoDetail } from "@/lib/types";

export function ReleasesTable({ detail }: { detail: RepoDetail }) {
  const { t } = useI18n();
  const [openTag, setOpenTag] = useState<string | null>(
    detail.releases[0]?.tag ?? null,
  );

  return (
    <div className="app-section mt-3">
      <div className="flex items-center justify-between pb-2">
        <div className="kpi-label text-faint">{t("Releases")}</div>
        <span className="font-mono text-[11.5px] text-faint tabular">
          {fmtNum(detail.releases.length)}
        </span>
      </div>
      <When
        condition={detail.releases.some((release) => release.downloads > 0)}
      >
        <div className="border-t border-hairline py-3">
          <BarList
            label={t("Releases")}
            formatValue={fmtCompact}
            items={[...detail.releases]
              .sort((a, b) => b.downloads - a.downloads)
              .slice(0, 8)
              .map((release) => ({
                label: release.tag,
                value: release.downloads,
              }))}
          />
        </div>
      </When>
      <If condition={detail.releases.length === 0}>
        <Then>
          <p className="px-5 py-6 text-center text-[13px] text-faint">
            {t("No releases published.")}
          </p>
        </Then>
        <Else>
          <ul>
            {detail.releases.map((release) => {
              const open = openTag === release.tag;
              return (
                <li
                  key={release.tag}
                  className="border-b border-hairline last:border-b-0"
                >
                  <Collapsible
                    className="[&_.sph-collapsible__trigger]:min-h-0 [&_.sph-collapsible__trigger]:gap-3 [&_.sph-collapsible__trigger]:px-4 [&_.sph-collapsible__trigger]:py-3 [&_.sph-collapsible__trigger]:hover:bg-hover [&_.sph-collapsible__trigger]:hover:text-paper [&_.sph-collapsible__inner]:p-0"
                    open={open}
                    onOpenChange={(nextOpen) =>
                      setOpenTag(nextOpen ? release.tag : null)
                    }
                    trigger={
                      <span className="flex w-full min-w-0 items-center gap-3 text-left">
                        <span className="font-mono text-[13px] text-paper">
                          {release.tag}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-[13px] text-mist">
                          {release.name && release.name !== release.tag
                            ? release.name
                            : ""}
                        </span>
                        <When condition={release.draft}>
                          <Badge
                            size="sm"
                            variant="neutral"
                            className="rounded-md border border-line px-1.5 py-px font-mono text-[10px] tracking-wide uppercase"
                          >
                            {t("Draft")}
                          </Badge>
                        </When>
                        <When condition={release.prerelease}>
                          <Badge
                            size="sm"
                            variant="accent"
                            className="rounded-md border border-line px-1.5 py-px font-mono text-[10px] tracking-wide uppercase"
                          >
                            {t("Pre")}
                          </Badge>
                        </When>
                        <span className="font-mono text-[12px] text-faint">
                          {fmtDate(release.publishedAt)}
                        </span>
                        <span className="w-16 text-right text-[13px] font-medium tabular">
                          {fmtCompact(release.downloads)}
                        </span>
                      </span>
                    }
                  >
                    {open ? (
                      <ul className="pr-4 pb-3.5 pl-10">
                        <If condition={release.assets.length === 0}>
                          <Then>
                            <li className="py-1 text-[12px] text-faint">
                              {t("No assets")}
                            </li>
                          </Then>
                          <Else>
                            {release.assets.map((asset) => (
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
                            ))}
                          </Else>
                        </If>
                      </ul>
                    ) : null}
                  </Collapsible>
                </li>
              );
            })}
          </ul>
        </Else>
      </If>
    </div>
  );
}
