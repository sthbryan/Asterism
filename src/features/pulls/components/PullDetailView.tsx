import { ArrowSquareOutIcon, CaretLeftIcon } from "@phosphor-icons/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Button, Spinner } from "@zovaris/sephiro";
import { If, Then, When } from "react-if";
import { useRoute } from "wouter";
import { useI18n } from "@/app/hooks";
import { useStore } from "@/app/store";
import { useScrollMemory } from "@/app/useScrollMemory";
import { useTransitionNavigate } from "@/app/useViewTransition";
import { PageHeader } from "@/components/PageHeader";
import type { PullRequestDetail } from "@/lib/types";
import { usePullDetail } from "../hooks/usePullDetail";
import { ErrorCard } from "./ErrorCard";
import { LoadingRows } from "./LoadingRows";
import { PullDetailBody } from "./PullDetailBody";

export function PullDetailView() {
  const [, params] = useRoute("/pull/:repo/:number");
  const { t, formatDate } = useI18n();
  const navigate = useTransitionNavigate();
  const account = useStore((state) => state.account);
  const revision = useStore((state) => state.dataRevision);
  const repo = decodeURIComponent(params?.repo ?? "");
  const number = Number(params?.number ?? 0);
  const detail = usePullDetail({ account, repo, number, revision });
  const scrollRef = useScrollMemory(`pull:${repo}#${number}`);
  const openGithub = () =>
    void openUrl(
      detail.pull?.url ?? `https://github.com/${repo}/pull/${number}`,
    );
  return (
    <>
      <PageHeader
        title={
          <nav className="flex items-center gap-2 text-[13px]">
            <Button
              variant="quiet"
              size="sm"
              className="-ml-2 shrink-0 text-mist hover:bg-hover hover:text-paper"
              onClick={() => navigate("/pulls")}
            >
              <CaretLeftIcon size={13} />
              {t("pulls.back")}
            </Button>
            <span className="text-faint">/</span>
            <span className="font-mono font-semibold">
              {repo} #{number}
            </span>
          </nav>
        }
        trailing={
          <Button
            variant="quiet"
            size="sm"
            className="shrink-0"
            onClick={openGithub}
          >
            <span>{t("pulls.openGithub")}</span>
            <ArrowSquareOutIcon size={12} />
          </Button>
        }
      />
      <div
        ref={scrollRef}
        className="h-full min-h-0 overflow-auto px-6 pt-5 pb-6"
      >
        <When condition={Boolean(detail.fetchedAt)}>
          <p className="mb-3 flex items-center gap-2 text-xs text-mist">
            {t("list.updated", {
              value: formatDate((detail.fetchedAt ?? 0) * 1000, {
                dateStyle: "medium",
                timeStyle: "short",
              }),
            })}
            <When condition={detail.refreshing}>
              <span role="status" className="inline-flex items-center gap-1">
                <Spinner size="sm" />
                {t("Refreshing…")}
              </span>
            </When>
          </p>
        </When>
        <When condition={detail.loading && !detail.pull}>
          <LoadingRows />
        </When>
        <When condition={Boolean(detail.error)}>
          <ErrorCard message={detail.error ?? ""} />
        </When>
        <If condition={Boolean(detail.pull)}>
          <Then>
            <PullDetailBody
              pull={detail.pull as PullRequestDetail}
              warning={detail.warning}
              filesOpen={detail.filesOpen}
              toggleFiles={detail.toggleFiles}
              diffOpen={detail.diffOpen}
              toggleDiff={detail.toggleDiff}
              diff={detail.diff}
              diffLoading={detail.diffLoading}
              diffRefreshing={detail.diffRefreshing}
              diffError={detail.diffError}
            />
          </Then>
        </If>
      </div>
    </>
  );
}
