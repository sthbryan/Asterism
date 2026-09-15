import {
  ArrowClockwiseIcon,
  CaretLeftIcon,
  CaretRightIcon,
} from "@phosphor-icons/react";
import { useMemo } from "react";
import { Case, Default, If, Switch, Then, When } from "react-if";
import { useI18n } from "@/app/hooks";
import { useStore } from "@/app/store";
import { useTransitionNavigate } from "@/app/useViewTransition";
import { Button } from "@/components/Button";
import { PageHeader } from "@/components/PageHeader";
import { usePullControls } from "../hooks/usePullControls";
import { usePullList } from "../hooks/usePullList";
import { filterPullRequests, pageOf, pullPath } from "../utils";
import { ErrorCard } from "./ErrorCard";
import { LoadingRows } from "./LoadingRows";
import { PartialErrors } from "./PartialErrors";
import { PullRow } from "./PullRow";
import { PullsControls } from "./PullsControls";

const PAGE_SIZE = 6;

export function PullsView() {
  const { t, formatDate, formatRelative } = useI18n();
  const navigate = useTransitionNavigate();
  const selectedNames = useStore((state) => state.selectedNames);
  const account = useStore((state) => state.account);
  const revision = useStore((state) => state.dataRevision);
  const controls = usePullControls();
  const data = usePullList({
    account,
    repos: selectedNames,
    revision,
  });
  const options = useMemo(() => {
    const unique = (values: string[]) =>
      Array.from(new Set(values.filter(Boolean))).sort();
    return {
      repos: unique(data.pulls.map((pull) => pull.repo)),
      authors: unique(data.pulls.map((pull) => pull.author ?? "")),
      assignees: unique(data.pulls.flatMap((pull) => pull.assignees)),
      reviewers: unique(data.pulls.flatMap((pull) => pull.reviewRequests)),
    };
  }, [data.pulls]);
  const filtered = useMemo(
    () => filterPullRequests(data.pulls, controls.filters),
    [controls.filters, data.pulls],
  );
  const page = pageOf(filtered, controls.page, PAGE_SIZE);
  const labels = {
    all: t("pulls.all"),
    search: `${t("Repository")} / ${t("pulls.author")}`,
    repo: t("pulls.repo"),
    author: t("pulls.author"),
    assignee: t("pulls.assignee"),
    reviewer: t("pulls.reviewRequested"),
    state: t("pulls.state"),
    open: t("pulls.open"),
    draft: t("pulls.draft"),
    closed: t("pulls.closed"),
    merged: t("pulls.merged"),
    clear: t("pulls.clear"),
  };
  const dateText = data.fetchedAt
    ? t("list.updated", {
        value: formatDate(data.fetchedAt * 1000, {
          dateStyle: "medium",
          timeStyle: "short",
        }),
      })
    : t("pulls.scope");
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
            aria-label={t("pulls.refresh")}
            title={t("pulls.refresh")}
            onClick={() => void data.refresh()}
            disabled={data.refreshing}
          >
            <ArrowClockwiseIcon
              size={14}
              className={data.refreshing ? "animate-spin" : ""}
            />
          </Button>
        }
      />
      <div className="h-full min-h-0 overflow-auto px-6 pt-5 pb-6">
        <PullsControls
          filters={controls.filters}
          options={options}
          onChange={controls.set}
          onClear={controls.clear}
          labels={labels}
        />
        <p className="mb-3 flex items-center gap-2 text-[11.5px] text-faint">
          {dateText}
          <When condition={data.refreshing && Boolean(data.fetchedAt)}>
            <span
              role="status"
              className="inline-flex items-center gap-1 text-mist"
            >
              <span
                aria-hidden
                className="inline-block size-3 animate-spin rounded-full border border-current border-t-transparent"
              />
              {t("Refreshing…")}
            </span>
          </When>
        </p>
        <When condition={Object.keys(data.errors).length > 0}>
          <PartialErrors errors={data.errors} />
        </When>
        <When condition={Boolean(data.error) && data.pulls.length === 0}>
          <ErrorCard message={data.error ?? ""} />
        </When>
        <When condition={data.loading && data.pulls.length === 0}>
          <LoadingRows />
        </When>
        <If condition={!data.loading && !data.error && page.items.length === 0}>
          <Then>
            <div className="card flex min-h-44 items-center justify-center p-8 text-center text-sm text-mist">
              <Switch>
                <Case condition={filtered.length > 0}>
                  {t("pulls.noResults")}
                </Case>
                <Default>{t("pulls.empty")}</Default>
              </Switch>
            </div>
          </Then>
        </If>
        <div className="flex flex-col gap-2">
          {page.items.map((pull) => (
            <PullRow
              key={`${pull.repo}#${pull.number}`}
              pull={pull}
              date={pull.updatedAt ? formatDate(new Date(pull.updatedAt)) : "—"}
              relativeDate={
                pull.updatedAt ? formatRelative(new Date(pull.updatedAt)) : ""
              }
              onOpen={() => navigate(pullPath(pull.repo, pull.number))}
            />
          ))}
        </div>
        <When condition={page.items.length > 0}>
          <div className="mt-4 flex items-center justify-center gap-3 text-[12px] text-mist">
            <Button
              variant="quiet"
              disabled={page.currentPage <= 1}
              aria-label={t("pulls.previous")}
              onClick={() =>
                controls.setPage(Math.max(1, page.currentPage - 1))
              }
            >
              <CaretLeftIcon size={14} />
              {t("pulls.previous")}
            </Button>
            <span className="font-mono text-faint">
              {t("pulls.page", { page: page.currentPage, pages: page.pages })}
            </span>
            <Button
              variant="quiet"
              disabled={page.currentPage >= page.pages}
              aria-label={t("pulls.next")}
              onClick={() =>
                controls.setPage(Math.min(page.pages, page.currentPage + 1))
              }
            >
              {t("pulls.next")}
              <CaretRightIcon size={14} />
            </Button>
          </div>
        </When>
      </div>
    </>
  );
}
