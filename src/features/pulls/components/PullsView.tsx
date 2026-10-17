import { ArrowClockwiseIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Button, EmptyState, IconButton, Spinner } from "@zovaris/sephiro";
import { useMemo } from "react";
import { Case, Default, Switch, When } from "react-if";
import { VList } from "virtua";
import { useI18n } from "@/app/hooks";
import { useStore } from "@/app/store";
import { useListMemory } from "@/app/useScrollMemory";
import { useTransitionNavigate } from "@/app/useViewTransition";
import { PageHeader } from "@/components/PageHeader";
import { usePullControls } from "../hooks/usePullControls";
import { usePullList } from "../hooks/usePullList";
import { filterPullRequests, pullPath } from "../utils";
import { ErrorCard } from "./ErrorCard";
import { LoadingRows } from "./LoadingRows";
import { PartialErrors } from "./PartialErrors";
import { PullRow } from "./PullRow";
import { PullsControls } from "./PullsControls";

export function PullsView() {
  const { t, formatDate, formatRelative } = useI18n();
  const navigate = useTransitionNavigate();
  const selectedNames = useStore((state) => state.selectedNames);
  const account = useStore((state) => state.account);
  const revision = useStore((state) => state.dataRevision);
  const controls = usePullControls();
  const list = useListMemory("pulls");
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
          <IconButton
            icon={
              <ArrowClockwiseIcon
                size={14}
                className={data.refreshing ? "animate-spin" : ""}
              />
            }
            label={t("pulls.refresh")}
            size="sm"
            title={t("pulls.refresh")}
            onClick={() => void data.refresh()}
            disabled={data.refreshing}
          />
        }
      />
      <div className="flex h-full min-h-0 flex-col px-6 pt-5 pb-5">
        <PullsControls
          filters={controls.filters}
          options={options}
          onChange={controls.set}
          onClear={controls.clear}
          labels={labels}
        />
        <p className="mb-3 flex shrink-0 items-center gap-2 text-[11.5px] text-faint">
          {dateText}
          <When condition={data.refreshing && Boolean(data.fetchedAt)}>
            <span
              role="status"
              className="inline-flex items-center gap-1 text-mist"
            >
              <Spinner size="sm" />
              {t("Refreshing…")}
            </span>
          </When>
        </p>
        <When condition={Object.keys(data.errors).length > 0}>
          <PartialErrors errors={data.errors} />
        </When>
        <div className="flex min-h-0 flex-1 flex-col">
          <Switch>
            <Case condition={Boolean(data.error) && data.pulls.length === 0}>
              <div className="min-h-0 flex-1 overflow-auto">
                <ErrorCard message={data.error ?? ""} />
              </div>
            </Case>
            <Case condition={data.loading && data.pulls.length === 0}>
              <div className="min-h-0 flex-1 overflow-hidden">
                <LoadingRows />
              </div>
            </Case>
            <Case
              condition={!data.loading && !data.error && filtered.length === 0}
            >
              <EmptyState
                compact
                className="app-card min-h-0 flex-1 content-center"
                icon={<MagnifyingGlassIcon />}
                title={
                  <Switch>
                    <Case condition={data.pulls.length > 0}>
                      {t("pulls.noResults")}
                    </Case>
                    <Default>{t("pulls.empty")}</Default>
                  </Switch>
                }
              />
            </Case>
            <Default>
              {/* Only the rows in view are mounted; loading more appends to the same window. */}
              <div className="min-h-0 flex-1">
                <VList
                  key={JSON.stringify(controls.filters)}
                  ref={list.ref}
                  onScroll={list.onScroll}
                  style={{ height: "100%" }}
                  aria-label={t("pulls.title")}
                >
                  {filtered.map((pull) => (
                    <div
                      key={`${pull.repo}#${pull.number}`}
                      className="px-1 pb-2"
                    >
                      <PullRow
                        pull={pull}
                        date={
                          pull.updatedAt
                            ? formatDate(new Date(pull.updatedAt))
                            : "—"
                        }
                        relativeDate={
                          pull.updatedAt
                            ? formatRelative(new Date(pull.updatedAt))
                            : ""
                        }
                        onOpen={() =>
                          navigate(pullPath(pull.repo, pull.number))
                        }
                      />
                    </div>
                  ))}
                  <When
                    condition={
                      data.canLoadMore ||
                      (data.loadingMore && filtered.length > 0)
                    }
                  >
                    <div className="px-1 pt-1 pb-3">
                      <Button
                        variant="secondary"
                        size="sm"
                        className="w-full"
                        disabled={data.loadingMore}
                        onClick={() => void data.loadMore()}
                      >
                        {data.loadingMore
                          ? t("pulls.loadingMore")
                          : t("pulls.loadMore")}
                      </Button>
                    </div>
                  </When>
                </VList>
              </div>
            </Default>
          </Switch>
        </div>
      </div>
    </>
  );
}
