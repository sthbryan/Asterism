import { StarIcon } from "@phosphor-icons/react";
import { Checkbox } from "@zovaris/sephiro";
import { When } from "react-if";
import { useI18n } from "@/app/hooks";
import { fmtNum } from "@/lib/format";
import { langColor } from "@/lib/langcolors";
import type { CatalogRepo } from "@/lib/types";
import { RepoMeta } from "./RepoMeta";

/** Shared by the row and the column header so the cells line up. */
export const ROW_COLS =
  "grid min-w-0 grid-cols-[minmax(0,1fr)_72px] items-center gap-3";

export function RepoRow({
  repo,
  selected,
  onToggle,
}: {
  repo: CatalogRepo;
  selected: boolean;
  onToggle: (fullName: string) => void;
}) {
  const { t } = useI18n();
  const [owner, name] = repo.fullName.split("/");
  const sub = repo.description || (repo.fork ? t("Fork") : null);
  return (
    <div className="border-b border-hairline last:border-b-0">
      <Checkbox
        size="sm"
        checked={selected}
        onChange={() => onToggle(repo.fullName)}
        aria-label={repo.fullName}
        className={`picker-row min-h-0 w-full gap-3 px-4 py-2.5 transition-colors ${
          selected ? "bg-wash" : "hover:bg-hover"
        }`}
        label={
          <span className={`${ROW_COLS} w-full`}>
            <span className="min-w-0">
              <span className="flex min-w-0 items-center gap-2">
                <span className="truncate text-[12.5px]">
                  <span className="text-faint">{owner}/</span>
                  <span className="font-medium">{name ?? repo.fullName}</span>
                </span>
                <When condition={Boolean(repo.language)}>
                  <span className="inline-flex shrink-0 items-center gap-1 rounded border border-line px-1 py-px leading-none font-mono text-[9px] text-mist">
                    <span
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: langColor(repo.language) }}
                    />
                    {repo.language}
                  </span>
                </When>
                <When condition={repo.private}>
                  <RepoMeta>{t("Private")}</RepoMeta>
                </When>
                <When condition={repo.archived}>
                  <RepoMeta>{t("Archived")}</RepoMeta>
                </When>
              </span>
              <When condition={Boolean(sub)}>
                <span className="mt-0.5 block truncate text-[11.5px] text-faint">
                  {sub}
                </span>
              </When>
            </span>
            <span className="justify-self-end font-mono text-[11.5px] text-mist tabular">
              <StarIcon
                size={10}
                className="mr-1 inline-block -translate-y-px text-faint"
              />
              {fmtNum(repo.stars)}
            </span>
          </span>
        }
      />
    </div>
  );
}
