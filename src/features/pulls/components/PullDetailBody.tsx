import {
  CheckCircleIcon,
  CodeIcon,
  GitBranchIcon,
  GitPullRequestIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { Badge } from "@zovaris/sephiro";
import { When } from "react-if";
import { useI18n } from "@/app/hooks";
import { Section } from "@/components/Section";
import type { PullRequestDetail, Saved } from "@/lib/types";
import { CheckBadge } from "./CheckBadge";
import { DetailDisclosure } from "./DetailDisclosure";
import { DiffBody } from "./DiffBody";
import { Fact } from "./Fact";
import { FileList } from "./FileList";
import { People } from "./People";
export function PullDetailBody({
  pull,
  warning,
  filesOpen,
  toggleFiles,
  diffOpen,
  toggleDiff,
  diff,
  diffLoading,
  diffRefreshing,
  diffError,
}: {
  pull: PullRequestDetail;
  warning: string | null;
  filesOpen: boolean;
  toggleFiles: () => void;
  diffOpen: boolean;
  toggleDiff: () => void;
  diff: Saved<string> | null;
  diffLoading: boolean;
  diffRefreshing: boolean;
  diffError: string | null;
}) {
  const { t, formatRelative } = useI18n();
  const statusVariant = pull.state === "OPEN" ? "success" : "neutral";
  const mergeableConflict = pull.mergeable === "CONFLICTING";
  const mergeableIcon = mergeableConflict ? (
    <WarningCircleIcon size={14} />
  ) : (
    <CheckCircleIcon size={14} />
  );
  const mergeableLabel = mergeableConflict
    ? t("pulls.conflicts")
    : t("pulls.mergeable");
  let diffLabel = t("pulls.loadDiff");
  if (diffOpen) diffLabel = t("pulls.closeDiff");
  if (diffLoading) diffLabel = t("pulls.loading");
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[20px] font-semibold tracking-[-0.03em]">
              {pull.title}
            </h1>
            <Badge variant={statusVariant}>{pull.state.toLowerCase()}</Badge>
            <When condition={pull.draft}>
              <Badge variant="neutral">{t("pulls.draft")}</Badge>
            </When>
          </div>
          <p className="mt-1 font-mono text-[12px] text-faint">
            {pull.repo} #{pull.number} · {pull.author ?? t("pulls.unknown")}
          </p>
        </div>
        <When condition={Boolean(warning)}>
          <span role="status" className="text-[11px] text-mist">
            {warning}
          </span>
        </When>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Fact
          icon={<GitBranchIcon size={14} />}
          label={t("pulls.branches", {
            head: pull.headRef ?? "?",
            base: pull.baseRef ?? "?",
          })}
          value={pull.mergeState ?? t("pulls.unknown")}
        />
        <Fact
          icon={mergeableIcon}
          label={mergeableLabel}
          value={pull.mergeable ?? t("pulls.unknown")}
        />
        <Fact
          icon={<CodeIcon size={14} />}
          label={t("pulls.checks")}
          value={<CheckBadge pull={pull} />}
        />
        <Fact
          icon={<GitPullRequestIcon size={14} />}
          label={t("pulls.reviews")}
          value={`${pull.approvals} ✓ · ${pull.changesRequested} !`}
        />
      </div>
      <Section>
        <div className="flex flex-wrap items-center gap-4 text-[12px] text-mist">
          <span>{pull.author ?? t("pulls.unknown")}</span>
          <span>
            <When condition={Boolean(pull.createdAt)}>
              {t("pulls.updated", {
                date: formatRelative(new Date(pull.createdAt ?? "")),
              })}
            </When>
          </span>
          <span className="text-ok">+{pull.additions}</span>
          <span className="text-accent-soft">−{pull.deletions}</span>
          <span>
            {pull.changedFiles} {t("pulls.files").toLowerCase()}
          </span>
        </div>
        <When condition={Boolean(pull.body)}>
          <p className="mt-4 whitespace-pre-wrap text-[13px] leading-relaxed text-paper">
            {pull.body}
          </p>
        </When>
      </Section>
      <section className="mt-3">
        <DetailDisclosure
          title={t("pulls.files")}
          count={pull.files.length}
          open={filesOpen}
          onOpenChange={toggleFiles}
          actionLabel={t("pulls.loadFiles")}
        >
          <div className="mt-1 border-t border-hairline">
            <FileList files={pull.files} />
          </div>
        </DetailDisclosure>
      </section>
      <section className="mt-3">
        <DetailDisclosure
          title={t("pulls.diff")}
          open={diffOpen}
          onOpenChange={toggleDiff}
          actionLabel={diffLabel}
        >
          <div className="mt-1 border-t border-hairline">
            <DiffBody
              diff={diff}
              loading={diffLoading}
              refreshing={diffRefreshing}
              error={diffError}
            />
          </div>
        </DetailDisclosure>
      </section>
      <When
        condition={pull.reviewRequests.length > 0 || pull.assignees.length > 0}
      >
        <Section className="grid gap-4 sm:grid-cols-2">
          <People
            title={t("pulls.reviewRequested")}
            values={pull.reviewRequests}
          />
          <People title={t("pulls.assignee")} values={pull.assignees} />
        </Section>
      </When>
    </div>
  );
}
