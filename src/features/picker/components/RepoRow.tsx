import { CheckIcon, StarIcon } from "@phosphor-icons/react";
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
      <button
        type="button"
        aria-pressed={selected}
        onClick={() => onToggle(repo.fullName)}
        onKeyDown={(e) => {
          if (e.key === " " || e.key === "Enter") {
            e.preventDefault();
            onToggle(repo.fullName);
          }
        }}
        className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors ${
          selected ? "bg-accent/[0.07] hover:bg-accent/[0.1]" : "hover:bg-hover"
        }`}
      >
        <span
          className={`grid h-4 w-4 shrink-0 place-items-center rounded-[5px] border transition-colors ${
            selected ? "border-accent bg-accent" : "border-line"
          }`}
        >
          <When condition={selected}>
            <CheckIcon size={10} weight="bold" className="text-white" />
          </When>
        </span>
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
      </button>
    </li>
  );
}
