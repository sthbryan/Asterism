import { useEffect, useRef, useState } from "react";
import {
  getCache,
  getConfig,
  getRepoDetail,
  getStatus,
  listCatalog,
  refreshTracked,
  saveConfig,
} from "./lib/api";
import type { CatalogRepo, RepoDetail, Status, TrackedRepo } from "./lib/types";
import { DetailView } from "./views/DetailView";
import { ErrorScreen } from "./views/ErrorScreen";
import { ListView } from "./views/ListView";
import { PickerView } from "./views/PickerView";

type Screen = "boot" | "error" | "list" | "picker" | "detail";

export default function App() {
  const [screen, setScreen] = useState<Screen>("boot");
  const [status, setStatus] = useState<Status | null>(null);
  const [tracked, setTracked] = useState<TrackedRepo[]>([]);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const [catalog, setCatalog] = useState<CatalogRepo[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const catalogRequest = useRef<Promise<void> | null>(null);

  const [detail, setDetail] = useState<RepoDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

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
        if (cache) {
          setTracked(cache.repos);
          setFetchedAt(cache.fetchedAt);
        }
        setScreen("list");
        void loadCatalog();
        if (cfg.repos.length > 0) {
          void runRefresh();
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
  }, []);

  async function runRefresh() {
    setRefreshing(true);
    setBanner(null);
    try {
      const cache = await refreshTracked();
      setTracked(cache.repos);
      setFetchedAt(cache.fetchedAt);
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

  async function persistSelection(repos: string[]) {
    try {
      const cfg = await saveConfig(repos);
      setSelectedNames(cfg.repos);
      setScreen("list");
      if (cfg.repos.length === 0) {
        setTracked([]);
        setFetchedAt(null);
        return;
      }
      void runRefresh();
    } catch (err) {
      setCatalogError(String(err));
    }
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
      } catch (err) {
        setDetailError(String(err));
      } finally {
        setDetailLoading(false);
      }
    })();
  }

  if (screen === "boot") {
    return (
      <div className="flex h-full items-center justify-center bg-void text-[14px] text-mist">
        Checking gh…
      </div>
    );
  }

  if (screen === "error" && status) {
    return <ErrorScreen status={status} />;
  }

  const login = status?.login ?? null;

  if (screen === "picker") {
    return (
      <PickerView
        login={login}
        catalog={catalog}
        loading={catalogLoading && catalog.length === 0}
        error={catalogError}
        initialSelected={selectedNames}
        onCancel={() => setScreen("list")}
        onSave={persistSelection}
      />
    );
  }

  if (screen === "detail") {
    return (
      <DetailView
        login={login}
        loading={detailLoading}
        error={detailError}
        detail={detail}
        onBack={() => setScreen("list")}
        onOpenPicker={openPicker}
      />
    );
  }

  return (
    <ListView
      login={login}
      repos={tracked}
      refreshing={refreshing}
      fetchedAt={fetchedAt}
      banner={banner}
      onRefresh={runRefresh}
      onOpenPicker={openPicker}
      onOpenRepo={openDetail}
    />
  );
}
