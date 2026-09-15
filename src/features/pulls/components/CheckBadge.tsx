import { CheckCircleIcon, ClockIcon, XCircleIcon } from "@phosphor-icons/react";
import { Case, Default, Switch } from "react-if";
import { useI18n } from "@/app/hooks";
import type { PullRequestSummary } from "@/lib/types";

export function CheckBadge({ pull }: { pull: PullRequestSummary }) {
  const { t } = useI18n();
  const state =
    pull.checks.failing > 0
      ? "failing"
      : pull.checks.pending > 0
        ? "pending"
        : pull.checks.passing > 0
          ? "passing"
          : "none";
  const color =
    state === "failing"
      ? "text-accent-soft"
      : state === "passing"
        ? "text-ok"
        : "text-mist";
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] ${color}`}>
      <Switch>
        <Case condition={state === "failing"}>
          <XCircleIcon size={13} weight="fill" />
          {t("pulls.failingChecks", { count: pull.checks.failing })}
        </Case>
        <Case condition={state === "pending"}>
          <ClockIcon size={13} weight="fill" />
          {t("pulls.pendingChecks", { count: pull.checks.pending })}
        </Case>
        <Case condition={state === "passing"}>
          <CheckCircleIcon size={13} weight="fill" />
          {t("pulls.passingChecks", { count: pull.checks.passing })}
        </Case>
        <Default>
          <CheckCircleIcon size={13} />
          {t("pulls.unknown")}
        </Default>
      </Switch>
    </span>
  );
}
