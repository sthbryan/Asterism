import {
  ArrowSquareOutIcon,
  ChatCircleIcon,
  CodeIcon,
  GitBranchIcon,
  GitDiffIcon,
  GitMergeIcon,
  NoteIcon,
} from "@phosphor-icons/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Avatar, Badge, Button } from "@zovaris/sephiro";
import { When } from "react-if";
import { useI18n } from "@/app/hooks";
import { Markdown } from "@/components/Markdown";
import type { PullDiff, PullRequestDetail, Saved } from "@/lib/types";
import { canReadDiffInline } from "../utils";
import { CheckBadge } from "./CheckBadge";
import { DetailDisclosure } from "./DetailDisclosure";
import { DiffBody } from "./DiffBody";
import { Fact } from "./Fact";
import { FileList } from "./FileList";
import { People } from "./People";

/** GraphQL enums read as words: UNSTABLE becomes Unstable. */
function human(value: string) {
  const lower = value.toLowerCase().replace(/_/g, " ");
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}

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
  diff: Saved<PullDiff> | null;
  diffLoading: boolean;
  diffRefreshing: boolean;
  diffError: string | null;
}) {
  const { t, formatRelative } = useI18n();
  const statusVariant = pull.state === "OPEN" ? "success" : "neutral";
  const conflict = pull.mergeable === "CONFLICTING";
  const mergeValue =
    pull.mergeable === "MERGEABLE"
      ? t("pulls.mergeable")
      : conflict
        ? t("pulls.conflicts")
        : t("pulls.unknown");
  let diffLabel = t("pulls.loadDiff");
  if (diffOpen) diffLabel = t("pulls.closeDiff");
  if (diffLoading) diffLabel = t("pulls.loading");
  const author = pull.author ?? t("pulls.unknown");
  const body = pull.body?.trim();
  const head = pull.headRef ?? "?";
  const base = pull.baseRef ?? "?";
  /* A null or unparseable timestamp must not reach Intl.RelativeTimeFormat. */
  const created = pull.createdAt ? new Date(pull.createdAt) : null;
  const createdLabel =
    created && !Number.isNaN(created.getTime())
      ? formatRelative(created)
      : null;
  const inlineDiff = canReadDiffInline(pull);
  const filesPartial = pull.changedFiles > pull.files.length;
  const openDiff = () => {
    if (pull.url) void openUrl(`${pull.url}/files`).catch(() => undefined);
  };

  return (
    <div className="space-y-band">
      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-[21px] leading-tight font-semibold tracking-[-0.03em]">
            {pull.title}
          </h1>
          <Badge variant={statusVariant}>{pull.state.toLowerCase()}</Badge>
          <When condition={pull.draft}>
            <Badge variant="neutral">{t("pulls.draft")}</Badge>
          </When>
        </div>
        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-mist">
          <span className="inline-flex items-center gap-1.5">
            <Avatar name={author} size="sm" />
            {author}
          </span>
          <When condition={createdLabel !== null}>
            <span className="text-faint" aria-hidden="true">
              ·
            </span>
            <span>{t("pulls.updated", { date: createdLabel ?? "" })}</span>
          </When>
          <When condition={Boolean(warning)}>
            <span role="status" className="text-faint">
              {warning}
            </span>
          </When>
        </p>
      </header>

      <section className="app-card grid divide-y divide-hairline sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        <Fact
          icon={<GitBranchIcon size={14} />}
          label={t("pulls.branchesLabel")}
          value={
            /* Only the head truncates, so the base branch stays readable. */
            <span
              className="flex min-w-0 items-center gap-1.5 font-mono text-[12px]"
              title={`${head} → ${base}`}
            >
              <span className="min-w-0 truncate">{head}</span>
              <span className="shrink-0 text-faint" aria-hidden="true">
                →
              </span>
              <span className="shrink-0">{base}</span>
            </span>
          }
        />
        <Fact
          icon={<GitMergeIcon size={14} />}
          label={t("pulls.merge")}
          value={
            <span className={conflict ? "text-accent-soft" : undefined}>
              {mergeValue}
            </span>
          }
          hint={pull.mergeState ? human(pull.mergeState) : null}
        />
        <Fact
          icon={<CodeIcon size={14} />}
          label={t("pulls.checks")}
          value={<CheckBadge pull={pull} />}
        />
        <Fact
          icon={<ChatCircleIcon size={14} />}
          label={t("pulls.reviews")}
          value={t("pulls.approvals", { count: pull.approvals })}
          hint={
            pull.changesRequested > 0
              ? t("pulls.changesRequested", { count: pull.changesRequested })
              : null
          }
        />
      </section>

      <section className="app-card overflow-hidden">
        <div className="app-card-head">
          <span className="app-chip">
            <NoteIcon size={15} />
          </span>
          <span className="kpi-label text-faint">{t("Description")}</span>
        </div>
        <div className="px-5 py-4">
          <When condition={Boolean(body)}>
            <Markdown text={body ?? ""} />
          </When>
          <When condition={!body}>
            <p className="text-[13px] text-faint">{t("pulls.noDescription")}</p>
          </When>
        </div>
      </section>

      <section className="app-card overflow-hidden">
        <div className="app-card-head">
          <span className="app-chip app-chip--accent">
            <GitDiffIcon size={15} />
          </span>
          <span className="kpi-label text-faint">{t("pulls.changes")}</span>
          <span className="ml-auto font-mono text-[11.5px] text-faint tabular">
            <span className="text-ok">+{pull.additions}</span>{" "}
            <span className="text-accent-soft">−{pull.deletions}</span> ·{" "}
            {pull.changedFiles} {t("pulls.files").toLowerCase()}
          </span>
        </div>
        <div className="divide-y divide-hairline">
          <DetailDisclosure
            title={t("pulls.files")}
            count={pull.files.length}
            open={filesOpen}
            onOpenChange={toggleFiles}
            actionLabel={t("pulls.loadFiles")}
          >
            <FileList files={pull.files} />
            <When condition={filesPartial}>
              <p className="border-t border-hairline px-4 py-2 text-[11.5px] text-faint">
                {t("pulls.filesPartial", {
                  shown: pull.files.length,
                  total: pull.changedFiles,
                })}
              </p>
            </When>
          </DetailDisclosure>
          <When condition={inlineDiff}>
            <DetailDisclosure
              title={t("pulls.diff")}
              open={diffOpen}
              onOpenChange={toggleDiff}
              actionLabel={diffLabel}
            >
              <DiffBody
                diff={diff}
                loading={diffLoading}
                refreshing={diffRefreshing}
                error={diffError}
              />
            </DetailDisclosure>
          </When>
          <When condition={!inlineDiff}>
            <div className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="min-w-0 flex-1 text-[12px] text-mist">
                {t("pulls.largeDiff", {
                  files: pull.changedFiles,
                  additions: pull.additions,
                  deletions: pull.deletions,
                })}
              </span>
              <Button
                variant="quiet"
                size="sm"
                className="shrink-0"
                onClick={openDiff}
              >
                <span>{t("pulls.openDiff")}</span>
                <ArrowSquareOutIcon size={12} />
              </Button>
            </div>
          </When>
        </div>
      </section>

      <When
        condition={pull.reviewRequests.length > 0 || pull.assignees.length > 0}
      >
        <section className="app-card grid divide-y divide-hairline sm:grid-cols-2 sm:divide-x sm:divide-y-0">
          <People
            title={t("pulls.reviewRequested")}
            values={pull.reviewRequests}
          />
          <People title={t("pulls.assignee")} values={pull.assignees} />
        </section>
      </When>
    </div>
  );
}
