import { GitBranchIcon, GitPullRequestIcon } from "@phosphor-icons/react";
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
  const stateClass =
    pull.state === "OPEN" ? "bg-ok/10 text-ok" : "bg-fill text-mist";
  return (
    <button
      type="button"
      className="card w-full p-4 text-left transition-colors hover:border-line hover:bg-hover"
      onClick={onOpen}
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-accent-soft">
          <GitPullRequestIcon size={17} weight="fill" />
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
              <span className="rounded-full bg-fill px-1.5 py-0.5 text-[10px] text-mist">
                {t("pulls.draft")}
              </span>
            </When>
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] ${stateClass}`}
            >
              {pull.state.toLowerCase()}
            </span>
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
