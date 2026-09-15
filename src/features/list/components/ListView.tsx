import {
  DownloadSimpleIcon,
  FolderSimpleIcon,
  GitForkIcon,
  StarIcon,
} from "@phosphor-icons/react";
import { cn } from "cn";
import { Else, If, Then, When } from "react-if";
import { useI18n } from "@/app/hooks";
import { detailPath } from "@/app/routes";
import { useStore } from "@/app/store";
import { useTransitionNavigate } from "@/app/useViewTransition";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { BarChart } from "@/components/Charts";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { ListSkeleton } from "@/components/Skeleton";
import { fmtNum } from "@/lib/format";
import { useListControls } from "../hooks/useListControls";
import { useListModel } from "../hooks/useListModel";
import { ListCharts } from "./ListCharts";
import { ListSidebar } from "./ListSidebar";
import { ListTrailing } from "./ListTrailing";
import { RepositoryTable } from "./RepositoryTable";

export function ListView() {
  const { t } = useI18n();
  const navigate = useTransitionNavigate();
  const selectedNames = useStore((s) => s.selectedNames);
  const repos = useStore((s) => s.tracked);
  const history = useStore((s) => s.history);
  const refreshing = useStore((s) => s.refreshing);
  const banner = useStore((s) => s.banner);
  const fetchedAt = useStore((s) => s.fetchedAt);
  const booted = useStore((s) => s.booted);
  const runRefresh = useStore((s) => s.runRefresh);

  const hasData = repos.length > 0 || selectedNames.length === 0;
  const awaitingInitialData =
    booted && selectedNames.length > 0 && !hasData && fetchedAt === null;
  const showSkeleton =
    !booted || (!hasData && (refreshing || awaitingInitialData));

  const { query, sort, setQuery, toggleSort } = useListControls();
  const {
    totals,
    starSeries,
    downloadSeries,
    kpis,
    chart,
    sidebar,
    platformBars,
    rows,
  } = useListModel({ repos, history, query, sort });

  const openRepo = (fullName: string) => navigate(detailPath(fullName));
  const showPartial =
    repos.some((repo) => repo.error) || selectedNames.length > repos.length;

  return (
    <>
      <PageHeader
        title={
          <h1 className="text-[15px] font-semibold tracking-[-0.01em]">
            {t("Overview")}
          </h1>
        }
        trailing={
          <ListTrailing
            refreshing={refreshing}
            fetchedAt={fetchedAt}
            onRefresh={() => void runRefresh(true)}
          />
        }
      />
      <div className={cn("t-skel h-full", showSkeleton ? "" : "is-revealed")}>
        <div className="t-skel-skeleton is-pulsing">
          <ListSkeleton />
        </div>
        <div className="t-skel-content">
          <div className="h-full min-h-0 overflow-auto px-6 pt-5 pb-6">
            <Banner
              message={banner ? `${t("errors.request")} ${banner}` : null}
            />
            <When condition={showPartial}>
              <p role="status" className="mb-3 text-sm text-mist">
                {t("errors.request")}
              </p>
            </When>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <KpiCard
                label={t("Repositories")}
                value={selectedNames.length}
                icon={<FolderSimpleIcon size={15} />}
                sub={t("tracked")}
              />
              <KpiCard
                label={t("Stars")}
                value={repos.length ? totals.stars : null}
                icon={<StarIcon size={15} />}
                sub={t("common.total")}
                delta={kpis.star?.delta}
                deltaHint={kpis.star?.hint}
              />
              <KpiCard
                label={t("Forks")}
                value={repos.length ? totals.forks : null}
                icon={<GitForkIcon size={15} />}
                sub={t("common.total")}
                delta={kpis.fork?.delta}
                deltaHint={kpis.fork?.hint}
              />
              <KpiCard
                label={t("Downloads")}
                value={repos.length ? totals.downloads : null}
                icon={<DownloadSimpleIcon size={15} />}
                sub={t("release assets")}
                hero
                delta={kpis.download?.delta}
                deltaHint={kpis.download?.hint}
              />
            </div>
            <When condition={repos.length > 0}>
              <ListCharts
                starSeries={starSeries}
                downloadSeries={downloadSeries}
              />
            </When>
            <If condition={repos.length === 0}>
              <Then>
                <div className="card mt-3 flex min-h-60 flex-col items-center justify-center px-8 text-center">
                  <h2 className="text-[16px] font-semibold tracking-[-0.02em]">
                    {t("No repositories tracked")}
                  </h2>
                  <p className="mt-2 max-w-sm text-[12.5px] leading-relaxed text-mist">
                    {t(
                      "Choose the repositories you want to watch. Only that set is synced.",
                    )}
                  </p>
                  <Button
                    variant="primary"
                    className="mt-4"
                    onClick={() => navigate("/repos")}
                  >
                    {t("Edit repositories")}
                  </Button>
                </div>
              </Then>
              <Else>
                <div className="mt-3 grid items-start gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,1fr)]">
                  <div className="flex min-w-0 flex-col gap-3">
                    <When condition={chart.show}>
                      <div className="card">
                        <div className="flex items-center gap-3 border-b border-hairline px-4 py-2.5">
                          <span className="text-[13px] font-semibold">
                            {t("Downloads by repo")}
                          </span>
                          <span className="ml-auto font-mono text-[11.5px] text-faint tabular">
                            {t("list.total", {
                              value: fmtNum(totals.downloads),
                            })}
                          </span>
                        </div>
                        <div className="p-4">
                          <BarChart items={chart.items} onSelect={openRepo} />
                        </div>
                      </div>
                    </When>
                    <RepositoryTable
                      rows={rows}
                      query={query}
                      sort={sort}
                      onQueryChange={setQuery}
                      onSort={toggleSort}
                      onOpenRepo={openRepo}
                    />
                  </div>
                  <ListSidebar
                    highlight={{ top: chart.top, share: chart.share }}
                    platformBars={platformBars}
                    languages={{
                      items: sidebar.languages,
                      total: repos.length || 1,
                    }}
                    stats={{
                      privateCount: sidebar.privateCount,
                      silentCount: sidebar.silentCount,
                      errorCount: sidebar.errorCount,
                    }}
                    onOpenRepo={openRepo}
                  />
                </div>
              </Else>
            </If>
          </div>
        </div>
      </div>
    </>
  );
}
