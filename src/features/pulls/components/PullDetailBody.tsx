import {
  CheckCircleIcon,
  CodeIcon,
  GitBranchIcon,
  GitPullRequestIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { When } from "react-if";
import { useI18n } from "@/app/hooks";
import type { PullRequestDetail, Saved } from "@/lib/types";
import { CheckBadge } from "./CheckBadge";
import { DetailDisclosure } from "./DetailDisclosure";
import { DiffBody } from "./DiffBody";
import { Fact } from "./Fact";
import { FileList } from "./FileList";
import { People } from "./People";

export function PullDetailBody({
  pull,
  fetchedAt,
  warning,
  offline,
  filesOpen,
  toggleFiles,
  diffOpen,
  loadDiff,
  diff,
  diffLoading,
  diffRefreshing,
  diffError,
}: {
  pull: PullRequestDetail;
  fetchedAt: number | null;
  warning: string | null;
  offline: boolean;
  filesOpen: boolean;
  toggleFiles: () => void;
  diffOpen: boolean;
  loadDiff: () => void;
  diff: Saved<string> | null;
  diffLoading: boolean;
  diffRefreshing: boolean;
  diffError: string | null;
}) {
  const { t, formatDate, formatRelative } = useI18n();
  const status =
    pull.state === "OPEN" ? "bg-ok/10 text-ok" : "bg-fill text-mist";
  const mergeableConflict = pull.mergeable === "CONFLICTING";
  const mergeableIcon = mergeableConflict ? (
    <WarningCircleIcon size={14} />
  ) : (
    <CheckCircleIcon size={14} />
  );
  const mergeableLabel = mergeableConflict
    ? t("pulls.conflicts")
    : t("pulls.mergeable");
  const diffLabel = diffLoading ? t("pulls.loading") : t("pulls.loadDiff");
  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-4 flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[20px] font-semibold tracking-[-0.03em]">
              {pull.title}
            </h1>
            <span className={`rounded-full px-2 py-0.5 text-[11px] ${status}`}>
              {pull.state.toLowerCase()}
            </span>
            <When condition={pull.draft}>
              <span className="rounded-full bg-fill px-2 py-0.5 text-[11px] text-mist">
                {t("pulls.draft")}
              </span>
            </When>
          </div>
          <p className="mt-1 font-mono text-[12px] text-faint">
            {pull.repo} #{pull.number} · {pull.author ?? t("pulls.unknown")}
          </p>
        </div>
        <When condition={offline && Boolean(fetchedAt)}>
          <span className="text-[11px] text-faint">
            {t("pulls.offline", { date: formatDate((fetchedAt ?? 0) * 1000) })}
          </span>
        </When>
        <When condition={Boolean(fetchedAt) && !offline}>
          <span className="text-[11px] text-faint">
            {t("offline.fetched", {
              date: formatDate((fetchedAt ?? 0) * 1000),
            })}
          </span>
        </When>
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
      <div className="card mt-3 p-4">
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
      </div>
      <section className="card mt-3 overflow-hidden">
        <DetailDisclosure
          title={t("pulls.files")}
          count={pull.files.length}
          open={filesOpen}
          onClick={toggleFiles}
          actionLabel={t("pulls.loadFiles")}
        />
        <When condition={filesOpen}>
          <FileList files={pull.files} />
        </When>
      </section>
      <section className="card mt-3 overflow-hidden">
        <DetailDisclosure
          title={t("pulls.diff")}
          open={diffOpen}
          onClick={loadDiff}
          actionLabel={diffLabel}
        />
        <When condition={diffOpen}>
          <DiffBody
            diff={diff}
            loading={diffLoading}
            refreshing={diffRefreshing}
            error={diffError}
          />
        </When>
      </section>
      <When
        condition={pull.reviewRequests.length > 0 || pull.assignees.length > 0}
      >
        <div className="card mt-3 grid gap-4 p-4 sm:grid-cols-2">
          <People
            title={t("pulls.reviewRequested")}
            values={pull.reviewRequests}
          />
          <People title={t("pulls.assignee")} values={pull.assignees} />
        </div>
      </When>
    </div>
  );
}
