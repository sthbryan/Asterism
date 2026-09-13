import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  getCache,
  getConfig,
  getRepoDetail,
  getStatus,
  isMockMode,
  listCatalog,
  refreshTracked,
  saveConfig,
} from "./lib/api";
import type { CatalogRepo, CreatedRepo, RepoDetail, RepoHistory, Status, ThemePref, TrackedRepo } from "./lib/types";
import { AppearanceProvider } from "./components/Appearance";
import { Chrome, type NavId } from "./components/Chrome";
import { DetailSkeleton, ListSkeleton } from "./components/Skeleton";
import { DetailTitle, DetailTrailing, DetailView } from "./views/DetailView";
import { ErrorScreen } from "./views/ErrorScreen";
import { ListTrailing, ListView } from "./views/ListView";
import { PickerTrailing, PickerView } from "./views/PickerView";

import { CreateView } from "./views/CreateView";

type Screen = "create" | "boot" | "error" | "list" | "picker" | "detail";

export default function App() {
  const [createVisited, setCreateVisited] = useState(false);
  const [bootAttempt, setBootAttempt] = useState(0);
  const [screen, setScreen] = useState<Screen>("boot");
  const [status, setStatus] = useState<Status | null>(null);
  const [tracked, setTracked] = useState<TrackedRepo[]>([]);
  const [history, setHistory] = useState<Record<string, RepoHistory>>({});
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);
  const [theme, setTheme] = useState<ThemePref>("dark");
  const [transparency, setTransparency] = useState(false);

  const [catalog, setCatalog] = useState<CatalogRepo[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const catalogRequest = useRef<Promise<void> | null>(null);

  const [detail, setDetail] = useState<RepoDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [page2, setPage2] = useState<"picker" | "detail">("detail");
  const [pickerDirty, setPickerDirty] = useState(false);
  const pickerSave = useRef<() => void>(() => undefined);

  useEffect(() => {
    if (screen === "picker" || screen === "detail") setPage2(screen);
  }, [screen]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const next = await getStatus();
        if (cancelled) return;
        setStatus(next);
        if (!next.ok) {
          setScreen("error");
          return;
        }
        const [cfg, cache] = await Promise.all([getConfig(), getCache()]);
        if (cancelled) return;
        setSelectedNames(cfg.repos);
        if (cfg.theme) setTheme(cfg.theme);
        setTransparency(Boolean(cfg.transparency));
        if (cache) {
          setTracked(cache.repos);
          setFetchedAt(cache.fetchedAt);
          setHistory(cache.history ?? {});
        }
        setScreen("list");
        void loadCatalog();
        if (cfg.repos.length > 0) {
          void runRefresh();
        }
        if (isMockMode()) {
          const params = new URLSearchParams(window.location.search);
          const screenParam = params.get("screen");
          if (screenParam === "create") {
            setCreateVisited(true);
            setScreen("create");
          } else if (screenParam === "picker") {
            setScreen("picker");
          } else if (screenParam === "detail") {
            const fullName = params.get("repo") ?? "sthbryan/hyperion";
            setScreen("detail");
            setDetail(null);
            setDetailError(null);
            setDetailLoading(true);
            try {
              const nextDetail = await getRepoDetail(fullName);
              if (cancelled) return;
              setDetail(nextDetail);
            } catch (err) {
              if (cancelled) return;
              setDetailError(String(err));
            } finally {
              if (!cancelled) setDetailLoading(false);
            }
          }
        }
      } catch (err) {
        if (cancelled) return;
        setStatus({
          ok: false,
          login: null,
          error: String(err),
          hint: "Install GitHub CLI from https://cli.github.com and run gh auth login.",
        });
        setScreen("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [bootAttempt]);

  async function runRefresh() {
    setRefreshing(true);
    setBanner(null);
    try {
      const cache = await refreshTracked();
      setTracked(cache.repos);
      setFetchedAt(cache.fetchedAt);
      setHistory(cache.history ?? {});
    } catch (err) {
      setBanner(String(err));
    } finally {
      setRefreshing(false);
    }
  }

  function loadCatalog() {
    if (catalogRequest.current) return catalogRequest.current;
    setCatalogLoading(true);
    setCatalogError(null);
    const request = (async () => {
      try {
        const rows = await listCatalog();
        setCatalog(rows);
      } catch (err) {
        setCatalogError(String(err));
      } finally {
        setCatalogLoading(false);
        catalogRequest.current = null;
      }
    })();
    catalogRequest.current = request;
    return request;
  }

  function openPicker() {
    setScreen("picker");
    if (catalog.length === 0) {
      void loadCatalog();
    }
  }

  function persistSelection(repos: string[]) {
    const previous = selectedNames;
    setSelectedNames(repos);
    setScreen("list");
    void (async () => {
      try {
        const cfg = await saveConfig(repos);
        setSelectedNames(cfg.repos);
        if (cfg.repos.length === 0) {
          setTracked([]);
          setFetchedAt(null);
          setHistory({});
          return;
        }
        void runRefresh();
      } catch (err) {
        setSelectedNames(previous);
        setBanner(String(err));
      }
    })();
  }

  function openDetail(fullName: string) {
    setScreen("detail");
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    void (async () => {
      try {
        const next = await getRepoDetail(fullName);
        setDetail(next);
        setHistory((prev) => ({
          ...prev,
          [fullName]: {
            stars: next.starHistory ?? [],
            downloads: next.downloadHistory ?? [],
            forks: prev[fullName]?.forks ?? [],
          },
        }));
      } catch (err) {
        setDetailError(String(err));
      } finally {
        setDetailLoading(false);
      }
    })();
  }

  async function handleCreated(repo: CreatedRepo, track: boolean) {
    void loadCatalog();
    if (track) {
      const cfg = await saveConfig([...new Set([...selectedNames, repo.fullName])]);
      setSelectedNames(cfg.repos);
      await runRefresh();
    }
  }

  const login = status?.login ?? null;
  const page = screen === "picker" || screen === "detail" ? "2" : "1";
  const nav: NavId = screen === "create" ? "create" : screen === "picker" ? "repos" : "overview";
  const listReady = screen !== "boot";

  let title: ReactNode = <h1 className="text-[15px] font-semibold tracking-[-0.01em]">Overview</h1>;
  let trailing: ReactNode = (
    <ListTrailing
      refreshing={refreshing}
      fetchedAt={fetchedAt}
      onRefresh={() => {
        void runRefresh();
      }}
    />
  );
  if (screen === "create") {
    title = <h1 className="text-[15px] font-semibold">Create repository</h1>;
    trailing = null;
  } else if (screen === "picker") {
    title = <h1 className="text-[15px] font-semibold tracking-[-0.01em]">Select repositories</h1>;
    trailing = (
      <PickerTrailing
        dirty={pickerDirty}
        loading={catalogLoading}
        onCancel={() => setScreen("list")}
        onSave={() => pickerSave.current()}
      />
    );
  } else if (screen === "detail") {
    title = <DetailTitle fullName={detail?.fullName} onBack={() => setScreen("list")} />;
    trailing = <DetailTrailing fullName={detail?.fullName} />;
  } else if (screen === "error") {
    title = "Setup";
    trailing = null;
  }

  return (
    <AppearanceProvider theme={theme} transparency={transparency}>
      <Chrome
        login={login}
        nav={nav}
        onNav={(id) => {
          if (!status?.ok) return;
          if (id === "create") { setCreateVisited(true); setScreen("create"); }
          if (id === "overview") setScreen("list");
          if (id === "repos") openPicker();
        }}
        trackedCount={selectedNames.length}
        title={title}
        trailing={trailing}
      >
        {createVisited && status?.ok && <div className="h-full" hidden={screen !== "create"}><CreateView login={login} onCreated={handleCreated} onOverview={() => setScreen("list")} /></div>}
        {screen === "error" && status ? (
          <ErrorScreen status={status} onRetry={() => { setScreen("boot"); setBootAttempt((value) => value + 1); }} />
        ) : screen === "create" ? null : (
          <div className="t-page-slide" data-page={page}>
            <section className="t-page" data-page-id="1">
              <div className={`t-skel h-full ${listReady ? "is-revealed" : ""}`}>
                <div className="t-skel-skeleton is-pulsing">
                  <ListSkeleton />
                </div>
                <div className="t-skel-content">
                  <ListView
                    repos={tracked}
                    history={history}
                    refreshing={refreshing}
                    banner={banner}
                    onOpenPicker={openPicker}
                    onOpenRepo={openDetail}
                  />
                </div>
              </div>
            </section>
            <section className="t-page" data-page-id="2">
              {page2 === "picker" ? (
                <PickerView
                  login={login}
                  catalog={catalog}
                  loading={catalogLoading && catalog.length === 0}
                  error={catalogError}
                  initialSelected={selectedNames}
                  onCancel={() => setScreen("list")}
                  onSave={persistSelection}
                  onDirtyChange={(dirty, save) => {
                    setPickerDirty(dirty);
                    pickerSave.current = save;
                  }}
                />
              ) : (
                <div className={`t-skel h-full ${detailLoading ? "" : "is-revealed"}`}>
                  <div className="t-skel-skeleton is-pulsing">
                    <DetailSkeleton />
                  </div>
                  <div className="t-skel-content">
                    <DetailView loading={false} error={detailError} detail={detail} />
                  </div>
                </div>
              )}
            </section>
          </div>
        )}
      </Chrome>
    </AppearanceProvider>
  );
}
