import { GitBranchIcon, GitPullRequestIcon } from "@phosphor-icons/react";
import { Badge } from "@zovaris/sephiro";
import { When } from "react-if";
import { useI18n } from "@/app/hooks";
import type { PullRequestSummary } from "@/lib/types";
import { CheckBadge } from "./CheckBadge";

export function PullRow({
  pull,
  date,
  relativeDate,
  onOpen,
}: {
  pull: PullRequestSummary;
  date: string;
  relativeDate: string;
  onOpen: () => void;
}) {
  const { t } = useI18n();
  const stateVariant = pull.state === "OPEN" ? "success" : "neutral";
  return (
    // The button's visible text (repository, number and title) is its label.
    // oxlint-disable-next-line jsx-a11y/control-has-associated-label
    <button
      type="button"
      className="app-row flex w-full items-start gap-3 px-4 py-3.5 text-left"
      onClick={onOpen}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="app-chip app-chip--accent mt-px">
          <GitPullRequestIcon size={15} weight="fill" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-[11px] text-faint">
              {pull.repo} #{pull.number}
            </span>
            <span className="truncate text-[14px] font-semibold">
              {pull.title}
            </span>
            <When condition={pull.draft}>
              <Badge
                size="sm"
                variant="neutral"
                className="px-1.5 py-0.5 text-[10px]"
              >
                {t("pulls.draft")}
              </Badge>
            </When>
            <Badge
              size="sm"
              variant={stateVariant}
              className="px-1.5 py-0.5 text-[10px]"
            >
              {pull.state.toLowerCase()}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11.5px] text-mist">
            <span>{pull.author ?? t("pulls.unknown")}</span>
            <span className="inline-flex items-center gap-1">
              <GitBranchIcon size={12} />
              {t("pulls.branches", {
                head: pull.headRef ?? "?",
                base: pull.baseRef ?? "?",
              })}
            </span>
            <CheckBadge pull={pull} />
            <span>
              <When condition={Boolean(pull.additions)}>
                <span className="text-ok">+{pull.additions}</span>
              </When>{" "}
              <When condition={Boolean(pull.deletions)}>
                <span className="text-accent-soft">−{pull.deletions}</span>
              </When>{" "}
              · {pull.changedFiles} {t("pulls.files").toLowerCase()}
            </span>
          </div>
        </div>
        <span
          className="shrink-0 text-right text-[10.5px] text-faint"
          title={date}
        >
          {t("pulls.updated", { date: relativeDate })}
        </span>
      </div>
    </button>
  );
}
