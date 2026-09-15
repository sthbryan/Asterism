import { ArrowSquareOutIcon, CaretLeftIcon } from "@phosphor-icons/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { If, Then, When } from "react-if";
import { useRoute } from "wouter";
import { useI18n } from "@/app/hooks";
import { useStore } from "@/app/store";
import { useTransitionNavigate } from "@/app/useViewTransition";
import { Button } from "@/components/Button";
import { PageHeader } from "@/components/PageHeader";
import type { PullRequestDetail } from "@/lib/types";
import { usePullDetail } from "../hooks/usePullDetail";
import { ErrorCard } from "./ErrorCard";
import { LoadingRows } from "./LoadingRows";
import { PullCacheStatus } from "./PullCacheStatus";
import { PullDetailBody } from "./PullDetailBody";

export function PullDetailView() {
  const [, params] = useRoute("/pull/:repo/:number");
  const { t } = useI18n();
  const navigate = useTransitionNavigate();
  const account = useStore((state) => state.account);
  const revision = useStore((state) => state.dataRevision);
  const offline = !useStore((state) => state.status?.ok);
  const repo = decodeURIComponent(params?.repo ?? "");
  const number = Number(params?.number ?? 0);
  const detail = usePullDetail({ account, repo, number, offline, revision });
  const openGithub = () =>
    void openUrl(
      detail.pull?.url ?? `https://github.com/${repo}/pull/${number}`,
    );
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
        <PullCacheStatus
          fetchedAt={detail.fetchedAt}
          refreshing={detail.refreshing}
          offline={offline}
        />
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
