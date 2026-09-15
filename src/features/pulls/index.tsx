import {
  ArrowClockwiseIcon,
  ArrowSquareOutIcon,
  CaretLeftIcon,
  CaretRightIcon,
  CheckCircleIcon,
  ClockIcon,
  CodeIcon,
  GitBranchIcon,
  GitPullRequestIcon,
  WarningCircleIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRoute } from "wouter";
import { useI18n } from "@/app/hooks";
import { useStore } from "@/app/store";
import { useTransitionNavigate } from "@/app/useViewTransition";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { PageHeader } from "@/components/PageHeader";
import { Select } from "@/components/Select";
import type {
  PullFile,
  PullRequestDetail,
  PullRequestSummary,
  Saved,
} from "@/lib/types";
import { getPullDiff, getPullRequest, listPullRequests } from "@/services/api";
import { filterPullRequests, pageOf, pullPath } from "./utils";

const PAGE_SIZE = 6;

function dateLabel(
  value: string | null,
  formatDate: (value: number | Date) => string,
) {
  return value ? formatDate(new Date(value)) : "—";
}

function checkState(pull: PullRequestSummary) {
  if (pull.checks.failing > 0) return "failing";
  if (pull.checks.pending > 0) return "pending";
  if (pull.checks.passing > 0) return "passing";
  return "none";
}

function CheckBadge({ pull }: { pull: PullRequestSummary }) {
  const { t } = useI18n();
  const state = checkState(pull);
  const label =
    state === "failing"
      ? t("pulls.failingChecks", { count: pull.checks.failing })
      : state === "pending"
        ? t("pulls.pendingChecks", { count: pull.checks.pending })
        : state === "passing"
          ? t("pulls.passingChecks", { count: pull.checks.passing })
          : t("pulls.unknown");
  const Icon =
    state === "failing"
      ? XCircleIcon
      : state === "pending"
        ? ClockIcon
        : CheckCircleIcon;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] ${state === "failing" ? "text-accent-soft" : state === "passing" ? "text-ok" : "text-mist"}`}
    >
      <Icon size={13} weight={state === "none" ? "regular" : "fill"} /> {label}
    </span>
  );
}

export function PullsView() {
  const { t, formatDate, formatRelative } = useI18n();
  const navigate = useTransitionNavigate();
  const selectedNames = useStore((s) => s.selectedNames);
  const status = useStore((s) => s.status);
  const [pulls, setPulls] = useState<PullRequestSummary[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [repo, setRepo] = useState("all");
  const [author, setAuthor] = useState("all");
  const [assignee, setAssignee] = useState("all");
  const [reviewer, setReviewer] = useState("all");
  const [state, setState] = useState("all");
  const [page, setPage] = useState(1);

  const offline = !status?.ok;
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listPullRequests(selectedNames, 100, offline);
      setPulls(result.pulls);
      setErrors(result.errors ?? {});
      setFetchedAt(result.fetchedAt);
    } catch (err) {
      setError(String(err));
      if (!offline) {
        try {
          const saved = await listPullRequests(selectedNames, 100, true);
          setPulls(saved.pulls);
          setErrors(saved.errors ?? {});
          setFetchedAt(saved.fetchedAt);
        } catch {
          setPulls([]);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [offline, selectedNames]);

  useEffect(() => {
    void load();
  }, [load]);

  const options = useMemo(() => {
    const unique = (values: string[]) =>
      Array.from(new Set(values.filter(Boolean))).sort();
    return {
      repos: unique(pulls.map((pull) => pull.repo)),
      authors: unique(pulls.map((pull) => pull.author ?? "")),
      assignees: unique(pulls.flatMap((pull) => pull.assignees)),
      reviewers: unique(pulls.flatMap((pull) => pull.reviewRequests)),
    };
  }, [pulls]);

  const filtered = useMemo(
    () =>
      filterPullRequests(pulls, {
        query,
        repo,
        author,
        assignee,
        reviewer,
        state,
      }),
    [author, assignee, pulls, query, repo, reviewer, state],
  );
  const {
    currentPage,
    pages,
    items: visible,
  } = pageOf(filtered, page, PAGE_SIZE);
  const clear = () => {
    setQuery("");
    setRepo("all");
    setAuthor("all");
    setAssignee("all");
    setReviewer("all");
    setState("all");
    setPage(1);
  };

  return (
    <>
      <PageHeader
        title={
          <h1 className="text-[15px] font-semibold tracking-[-0.01em]">
            {t("pulls.title")}
          </h1>
        }
        trailing={
          <Button
            variant="quiet"
            onClick={() => void load()}
            disabled={loading}
          >
            <ArrowClockwiseIcon
              size={14}
              className={loading ? "animate-spin" : ""}
            />
            {loading ? t("pulls.refreshing") : t("pulls.refresh")}
          </Button>
        }
      />
      <div className="h-full min-h-0 overflow-auto px-6 pt-5 pb-6">
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="min-w-52 flex-1">
            <label className="kpi-label text-faint" htmlFor="pull-search">
              {t("Repository")} / {t("pulls.author")}
            </label>
            <Input
              id="pull-search"
              variant="field"
              className="mt-1"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setPage(1);
              }}
              placeholder="owner/repo, title…"
            />
          </div>
          <FilterSelect
            label={t("pulls.repo")}
            value={repo}
            onChange={(value) => {
              setRepo(value);
              setPage(1);
            }}
            options={[
              { value: "all", label: t("pulls.all") },
              ...options.repos.map((value) => ({ value, label: value })),
            ]}
          />
          <FilterSelect
            label={t("pulls.author")}
            value={author}
            onChange={(value) => {
              setAuthor(value);
              setPage(1);
            }}
            options={[
              { value: "all", label: t("pulls.all") },
              ...options.authors.map((value) => ({ value, label: value })),
            ]}
          />
          <FilterSelect
            label={t("pulls.assignee")}
            value={assignee}
            onChange={(value) => {
              setAssignee(value);
              setPage(1);
            }}
            options={[
              { value: "all", label: t("pulls.all") },
              ...options.assignees.map((value) => ({ value, label: value })),
            ]}
          />
          <FilterSelect
            label={t("pulls.reviewRequested")}
            value={reviewer}
            onChange={(value) => {
              setReviewer(value);
              setPage(1);
            }}
            options={[
              { value: "all", label: t("pulls.all") },
              ...options.reviewers.map((value) => ({ value, label: value })),
            ]}
          />
          <FilterSelect
            label={t("pulls.state")}
            value={state}
            onChange={(value) => {
              setState(value);
              setPage(1);
            }}
            options={[
              { value: "open", label: t("pulls.open") },
              { value: "draft", label: t("pulls.draft") },
              { value: "closed", label: t("pulls.closed") },
              { value: "merged", label: t("pulls.merged") },
              { value: "all", label: t("pulls.all") },
            ]}
          />
          <Button variant="quiet" onClick={clear}>
            {t("pulls.clear")}
          </Button>
        </div>
        <p className="mb-3 text-[11.5px] text-faint">
          {offline && fetchedAt
            ? t("pulls.offline", { date: formatDate(fetchedAt * 1000) })
            : t("pulls.scope")}
        </p>
        {Object.keys(errors).length > 0 ? (
          <PartialErrors errors={errors} />
        ) : null}
        {error && pulls.length === 0 ? <ErrorCard message={error} /> : null}
        {loading && pulls.length === 0 ? <LoadingRows /> : null}
        {!loading && !error && visible.length === 0 ? (
          <div className="card flex min-h-44 items-center justify-center p-8 text-center text-sm text-mist">
            {filtered.length ? t("pulls.noResults") : t("pulls.empty")}
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          {visible.map((pull) => (
            <PullRow
              key={`${pull.repo}#${pull.number}`}
              pull={pull}
              date={dateLabel(pull.updatedAt, formatDate)}
              relativeDate={
                pull.updatedAt ? formatRelative(new Date(pull.updatedAt)) : ""
              }
              onOpen={() => navigate(pullPath(pull.repo, pull.number))}
            />
          ))}
        </div>
        {visible.length > 0 ? (
          <div className="mt-4 flex items-center justify-center gap-3 text-[12px] text-mist">
            <Button
              variant="quiet"
              disabled={currentPage <= 1}
              aria-label={t("pulls.previous")}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              <CaretLeftIcon size={14} />
              {t("pulls.previous")}
            </Button>
            <span className="font-mono text-faint">
              {t("pulls.page", { page: currentPage, pages })}
            </span>
            <Button
              variant="quiet"
              disabled={currentPage >= pages}
              aria-label={t("pulls.next")}
              onClick={() => setPage((value) => Math.min(pages, value + 1))}
            >
              {t("pulls.next")}
              <CaretRightIcon size={14} />
            </Button>
          </div>
        ) : null}
      </div>
    </>
  );
}

function FilterSelect({
  label,
  ...props
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  const id = `pull-filter-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  return (
    <div className="w-36">
      <label className="kpi-label text-faint" htmlFor={id}>
        {label}
      </label>
      <Select {...props} id={id} className="mt-1" ariaLabel={label} />
    </div>
  );
}

function PullRow({
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
            {pull.draft ? (
              <span className="rounded-full bg-fill px-1.5 py-0.5 text-[10px] text-mist">
                {t("pulls.draft")}
              </span>
            ) : null}
            <span
              className={`rounded-full px-1.5 py-0.5 text-[10px] ${pull.state === "OPEN" ? "bg-ok/10 text-ok" : "bg-fill text-mist"}`}
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
              {pull.additions ? (
                <span className="text-ok">+{pull.additions}</span>
              ) : null}{" "}
              {pull.deletions ? (
                <span className="text-accent-soft">−{pull.deletions}</span>
              ) : null}{" "}
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

function PartialErrors({ errors }: { errors: Record<string, string> }) {
  const { t } = useI18n();
  return (
    <div className="mb-3 rounded-lg border border-accent/30 bg-accent/5 p-3 text-[12px] text-mist">
      <div className="flex items-center gap-2 text-accent-soft">
        <WarningCircleIcon size={14} />
        {t("pulls.partial")}
      </div>
      <div className="mt-2 grid gap-1">
        {Object.entries(errors).map(([repo, message]) => (
          <div key={repo} className="flex flex-wrap gap-2">
            <span className="font-mono text-paper">{repo}</span>
            <span>{message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  const { t } = useI18n();
  return (
    <div className="card mb-3 flex items-start gap-3 p-4 text-[13px] text-accent-soft">
      <WarningCircleIcon size={16} />
      <div>
        <p>{t("pulls.error")}</p>
        <p className="mt-1 break-words text-mist">{message}</p>
      </div>
    </div>
  );
}

function LoadingRows() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true">
      {["a", "b", "c", "d"].map((key) => (
        <div key={key} className="card h-24 animate-pulse bg-wash" />
      ))}
    </div>
  );
}

export function PullDetailView() {
  const [, params] = useRoute("/pull/:repo/:number");
  const { t } = useI18n();
  const navigate = useTransitionNavigate();
  const status = useStore((s) => s.status);
  const repo = decodeURIComponent(params?.repo ?? "");
  const number = Number(params?.number ?? 0);
  const offline = !status?.ok;
  const [saved, setSaved] = useState<Saved<PullRequestDetail> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [filesOpen, setFilesOpen] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  const [diff, setDiff] = useState<Saved<string> | null>(null);
  const [diffError, setDiffError] = useState<string | null>(null);
  const [diffLoading, setDiffLoading] = useState(false);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setSaved(null);
    void getPullRequest(repo, number, offline)
      .then((value) => {
        if (active) setSaved(value);
      })
      .catch(async (reason) => {
        if (!offline) {
          try {
            const value = await getPullRequest(repo, number, true);
            if (active) setSaved(value);
            return;
          } catch {
            /* use original error */
          }
        }
        if (active) setError(String(reason));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [repo, number, offline]);

  const pull = saved?.data;
  const openGithub = () => {
    void openUrl(pull?.url ?? `https://github.com/${repo}/pull/${number}`);
  };
  const loadDiff = async () => {
    setDiffOpen(true);
    if (diff || diffLoading) return;
    setDiffLoading(true);
    setDiffError(null);
    try {
      setDiff(await getPullDiff(repo, number, offline));
    } catch (reason) {
      setDiffError(String(reason));
    } finally {
      setDiffLoading(false);
    }
  };
  return (
    <>
      <PageHeader
        title={
          <nav className="flex items-center gap-2 text-[13px]">
            <button
              type="button"
              className="-ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium text-mist hover:bg-hover hover:text-paper"
              onClick={() => navigate("/pulls")}
            >
              <CaretLeftIcon size={13} />
              {t("pulls.back")}
            </button>
            <span className="text-faint">/</span>
            <span className="font-mono font-semibold">
              {repo} #{number}
            </span>
          </nav>
        }
        trailing={
          <Button variant="quiet" onClick={openGithub}>
            <span>{t("pulls.openGithub")}</span>
            <ArrowSquareOutIcon size={12} />
          </Button>
        }
      />
      <div className="h-full min-h-0 overflow-auto px-6 pt-5 pb-6">
        {loading ? <LoadingRows /> : null}
        {error ? <ErrorCard message={error} /> : null}
        {pull ? (
          <PullDetailContent
            pull={pull}
            fetchedAt={saved?.fetchedAt ?? null}
            offline={offline}
            filesOpen={filesOpen}
            setFilesOpen={setFilesOpen}
            diffOpen={diffOpen}
            loadDiff={() => void loadDiff()}
            diff={diff}
            diffLoading={diffLoading}
            diffError={diffError}
          />
        ) : null}
      </div>
    </>
  );
}

function PullDetailContent({
  pull,
  fetchedAt,
  offline,
  filesOpen,
  setFilesOpen,
  diffOpen,
  loadDiff,
  diff,
  diffLoading,
  diffError,
}: {
  pull: PullRequestDetail;
  fetchedAt: number | null;
  offline: boolean;
  filesOpen: boolean;
  setFilesOpen: (value: boolean) => void;
  diffOpen: boolean;
  loadDiff: () => void;
  diff: Saved<string> | null;
  diffLoading: boolean;
  diffError: string | null;
}) {
  const { t, formatDate, formatRelative } = useI18n();
  const status =
    pull.state === "OPEN" ? "bg-ok/10 text-ok" : "bg-fill text-mist";
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
            {pull.draft ? (
              <span className="rounded-full bg-fill px-2 py-0.5 text-[11px] text-mist">
                {t("pulls.draft")}
              </span>
            ) : null}
          </div>
          <p className="mt-1 font-mono text-[12px] text-faint">
            {pull.repo} #{pull.number} · {pull.author ?? t("pulls.unknown")}
          </p>
        </div>
        {offline && fetchedAt ? (
          <span className="text-[11px] text-faint">
            {t("pulls.offline", { date: formatDate(fetchedAt * 1000) })}
          </span>
        ) : null}
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
          icon={
            pull.mergeable === "CONFLICTING" ? (
              <WarningCircleIcon size={14} />
            ) : (
              <CheckCircleIcon size={14} />
            )
          }
          label={
            pull.mergeable === "CONFLICTING"
              ? t("pulls.conflicts")
              : t("pulls.mergeable")
          }
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
            {pull.createdAt
              ? t("pulls.updated", {
                  date: formatRelative(new Date(pull.createdAt)),
                })
              : ""}
          </span>
          <span className="text-ok">+{pull.additions}</span>
          <span className="text-accent-soft">−{pull.deletions}</span>
          <span>
            {pull.changedFiles} {t("pulls.files").toLowerCase()}
          </span>
        </div>
        {pull.body ? (
          <p className="mt-4 whitespace-pre-wrap text-[13px] leading-relaxed text-paper">
            {pull.body}
          </p>
        ) : null}
      </div>
      <section className="card mt-3 overflow-hidden">
        <DetailDisclosure
          title={t("pulls.files")}
          count={pull.files.length}
          open={filesOpen}
          onClick={() => setFilesOpen(!filesOpen)}
          actionLabel={t("pulls.loadFiles")}
        />
        {filesOpen ? <FileList files={pull.files} /> : null}
      </section>
      <section className="card mt-3 overflow-hidden">
        <DetailDisclosure
          title={t("pulls.diff")}
          open={diffOpen}
          onClick={loadDiff}
          actionLabel={diffLoading ? t("pulls.loading") : t("pulls.loadDiff")}
        />
        {diffOpen ? (
          diffLoading ? (
            <div className="p-4 text-[12px] text-mist">
              {t("pulls.loading")}
            </div>
          ) : diffError ? (
            <div className="p-4 text-[12px] text-accent-soft">{diffError}</div>
          ) : diff ? (
            <pre className="max-h-112 overflow-auto border-t border-hairline bg-void p-4 font-mono text-[11px] leading-relaxed text-mist">
              {diff.data}
            </pre>
          ) : null
        ) : null}
      </section>
      {pull.reviewRequests.length || pull.assignees.length ? (
        <div className="card mt-3 grid gap-4 p-4 sm:grid-cols-2">
          <People
            title={t("pulls.reviewRequested")}
            values={pull.reviewRequests}
          />
          <People title={t("pulls.assignee")} values={pull.assignees} />
        </div>
      ) : null}
    </div>
  );
}

function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="card p-3">
      <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.08em] text-faint">
        {icon}
        {label}
      </div>
      <div className="mt-2 truncate text-[12.5px] font-semibold">{value}</div>
    </div>
  );
}
function DetailDisclosure({
  title,
  count,
  open,
  onClick,
  actionLabel,
}: {
  title: string;
  count?: number;
  open: boolean;
  onClick: () => void;
  actionLabel: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-[13px] font-semibold">{title}</span>
      {count != null ? (
        <span className="rounded-full bg-fill px-1.5 py-0.5 font-mono text-[10px] text-mist">
          {count}
        </span>
      ) : null}
      <Button className="ml-auto" variant="quiet" onClick={onClick}>
        {open ? "⌃" : "⌄"} {actionLabel}
      </Button>
    </div>
  );
}
function FileList({ files }: { files: PullFile[] }) {
  return (
    <div className="border-t border-hairline">
      {files.length ? (
        files.map((file) => (
          <div
            key={file.path}
            className="flex items-center gap-3 px-4 py-2 text-[12px]"
          >
            <CodeIcon size={13} className="shrink-0 text-faint" />
            <span className="min-w-0 flex-1 truncate font-mono">
              {file.path}
            </span>
            <span className="shrink-0 text-ok">+{file.additions}</span>
            <span className="shrink-0 text-accent-soft">−{file.deletions}</span>
          </div>
        ))
      ) : (
        <div className="p-4 text-[12px] text-mist">—</div>
      )}
    </div>
  );
}
function People({ title, values }: { title: string; values: string[] }) {
  return (
    <div>
      <div className="kpi-label text-faint">{title}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {values.length ? (
          values.map((value) => (
            <span
              key={value}
              className="rounded-full bg-fill px-2 py-1 text-[11px]"
            >
              {value}
            </span>
          ))
        ) : (
          <span className="text-[12px] text-mist">—</span>
        )}
      </div>
    </div>
  );
}
