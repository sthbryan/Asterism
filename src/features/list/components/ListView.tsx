import {
  DownloadSimpleIcon,
  FolderSimpleIcon,
  GitForkIcon,
  StarIcon,
} from "@phosphor-icons/react";
import { Button, EmptyState } from "@zovaris/sephiro";
import { cn } from "cn";
import { Else, If, Then, When } from "react-if";
import { useI18n } from "@/app/hooks";
import { detailPath } from "@/app/routes";
import { useStore } from "@/app/store";
import { useTransitionNavigate } from "@/app/useViewTransition";
import { Banner } from "@/components/Banner";
import { BarList } from "@/components/BarList";
import { KpiCard } from "@/components/KpiCard";
import { PageHeader } from "@/components/PageHeader";
import { Section } from "@/components/Section";
import { ListSkeleton } from "@/components/Skeleton";
import { fmtCompact, fmtNum } from "@/lib/format";
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
          <div className="flex h-full min-h-0 flex-col px-6 pt-5 pb-5">
            <Banner
              message={banner ? `${t("errors.request")} ${banner}` : null}
            />
            <When condition={showPartial}>
              <p role="status" className="mb-3 shrink-0 text-sm text-mist">
                {t("errors.request")}
              </p>
            </When>
            <div className="app-kpis shrink-0">
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
            <If condition={repos.length === 0}>
              <Then>
                <EmptyState
                  className="app-card mt-band min-h-0 flex-1 content-center"
                  icon={<FolderSimpleIcon />}
                  title={t("No repositories tracked")}
                  description={t(
                    "Choose the repositories you want to watch. Only that set is synced.",
                  )}
                  action={
                    <Button
                      variant="primary"
                      size="sm"
                      className="shrink-0"
                      onClick={() => navigate("/repos")}
                    >
                      {t("Edit repositories")}
                    </Button>
                  }
                />
              </Then>
              <Else>
                <div className="mt-band grid min-h-0 flex-1 items-stretch gap-band md:grid-cols-[minmax(0,1.65fr)_minmax(260px,1fr)]">
                  <RepositoryTable
                    rows={rows}
                    query={query}
                    sort={sort}
                    onQueryChange={setQuery}
                    onSort={toggleSort}
                    onOpenRepo={openRepo}
                  />
                  <div className="min-h-0 min-w-0 space-y-band overflow-y-auto pb-1">
                    <ListCharts
                      starSeries={starSeries}
                      downloadSeries={downloadSeries}
                    />
                    <When condition={chart.show}>
                      <Section
                        label={t("Downloads by repo")}
                        icon={<DownloadSimpleIcon size={15} />}
                        meta={t("list.total", {
                          value: fmtNum(totals.downloads),
                        })}
                      >
                        <BarList
                          label={t("Downloads by repo")}
                          formatValue={fmtCompact}
                          items={chart.items}
                          onSelect={(item) => openRepo(item.label)}
                          displayLabel={(label) =>
                            label.split("/").pop() ?? label
                          }
                        />
                      </Section>
                    </When>
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
                </div>
              </Else>
            </If>
          </div>
        </div>
      </div>
    </>
  );
}
