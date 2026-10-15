import { StarIcon } from "@phosphor-icons/react";
import { Checkbox } from "@zovaris/sephiro";
import { When } from "react-if";
import { useI18n } from "@/app/hooks";
import { fmtNum } from "@/lib/format";
import type { CatalogRepo } from "@/lib/types";
import { RepoMeta } from "./RepoMeta";

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
  const sub =
    repo.description ||
    [repo.language, repo.fork ? t("Fork") : null].filter(Boolean).join(" · ") ||
    null;
  return (
    <li className="border-b border-hairline last:border-b-0">
      <Checkbox
        size="sm"
        checked={selected}
        onChange={() => onToggle(repo.fullName)}
        aria-label={repo.fullName}
        className={`min-h-0 w-full gap-3 [&_.sph-checkbox__label]:min-w-0 [&_.sph-checkbox__label]:flex-1 px-4 py-2.5 transition-colors ${
          selected ? "bg-accent/[0.07] hover:bg-accent/[0.1]" : "hover:bg-hover"
        }`}
        label={
          <span className="flex min-w-0 flex-1 items-center gap-3 text-left">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-mono text-[12.5px] font-medium">
                {repo.fullName}
              </span>
              <When condition={Boolean(sub)}>
                <span className="mt-0.5 block truncate text-[11.5px] text-faint">
                  {sub}
                </span>
              </When>
            </span>
            <span className="flex shrink-0 items-center gap-3 font-mono text-[11.5px] text-mist">
              <When condition={repo.private}>
                <RepoMeta>{t("Private")}</RepoMeta>
              </When>
              <When condition={repo.archived}>
                <RepoMeta>{t("Archived")}</RepoMeta>
              </When>
              <span className="tabular">
                <StarIcon
                  size={10}
                  className="mr-1 inline-block -translate-y-px text-faint"
                />
                {fmtNum(repo.stars)}
              </span>
            </span>
          </span>
        }
      />
    </li>
  );
}
