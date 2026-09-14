import { useEffect, type ReactNode } from "react";
import { Redirect, useLocation, useRoute } from "wouter";
import { AppearanceProvider } from "../components/Appearance";
import { Chrome, type NavId } from "../components/Chrome";
import { DetailSkeleton, ListSkeleton } from "../components/Skeleton";
import { DetailTitle, DetailTrailing, DetailView } from "../views/DetailView";
import { ErrorScreen } from "../views/ErrorScreen";
import { ListTrailing, ListView } from "../views/ListView";
import { PickerTrailing, PickerView } from "../views/PickerView";
import { CreateView } from "../views/CreateView";
import { useStore } from "./store";
import {
  decodeDetailParam,
  detailPath,
  useBoot,
  useCatalog,
  useDetail,
} from "./hooks";

export function Shell() {
  useBoot();
  const { state } = useStore();
  return (
    <AppearanceProvider theme={state.theme} transparency={state.transparency}>
      {!state.booted ? (
        <BootShell />
      ) : state.status && !state.status.ok ? (
        <SetupShell />
      ) : (
        <MainShell />
      )}
    </AppearanceProvider>
  );
}

function BootShell() {
  const { state, runRefresh } = useStore();
  const [, navigate] = useLocation();
  const login = state.status?.login ?? null;
  return (
    <Chrome
      login={login}
      nav="overview"
      onNav={(id) => {
        if (!state.status?.ok) return;
        if (id === "create") navigate("/create");
        if (id === "overview") navigate("/");
        if (id === "repos") navigate("/repos");
      }}
      trackedCount={state.selectedNames.length}
      title={<h1 className="text-[15px] font-semibold tracking-[-0.01em]">Overview</h1>}
      trailing={
        <ListTrailing
          refreshing={state.refreshing}
          fetchedAt={state.fetchedAt}
          onRefresh={() => {
            void runRefresh();
          }}
        />
      }
    >
      <div className="t-page-slide" data-page="1">
        <ListPage revealed={false} />
      </div>
    </Chrome>
  );
}

function SetupShell() {
  const { state, retryBoot } = useStore();
  const [, navigate] = useLocation();
  if (!state.status) return null;
  return (
    <Chrome
      login={state.status.login}
      nav="overview"
      onNav={(id) => {
        if (!state.status?.ok) return;
        if (id === "create") navigate("/create");
        if (id === "overview") navigate("/");
        if (id === "repos") navigate("/repos");
      }}
      trackedCount={state.selectedNames.length}
      title="Setup"
      trailing={null}
    >
      <ErrorScreen status={state.status} onRetry={retryBoot} />
    </Chrome>
  );
}

function MainShell() {
  const { state, runRefresh, pickerDirty, pickerSave } = useStore();
  const [, navigate] = useLocation();
  const [isRepos] = useRoute("/repos");
  const [isCreate] = useRoute("/create");
  const [isDetail, detailParams] = useRoute("/repo/:fullName");
  const [isSetup] = useRoute("/setup");
  const [isBoot] = useRoute("/boot");

  useEffect(() => {
    if (!isCreate && !isRepos && !isDetail && !isSetup && !isBoot) {
      navigate("/", { replace: true });
    }
  }, [isBoot, isCreate, isDetail, isRepos, isSetup, navigate]);

  if (isSetup || isBoot) return <Redirect to="/" />;

  const view = isCreate ? "create" : isRepos ? "picker" : isDetail ? "detail" : "list";

  function goList() {
    navigate("/");
  }

  const login = state.status?.login ?? null;
  const page = view === "picker" || view === "detail" ? "2" : "1";
  const nav: NavId = view === "create" ? "create" : view === "picker" ? "repos" : "overview";

  let title: ReactNode = <h1 className="text-[15px] font-semibold tracking-[-0.01em]">Overview</h1>;
  let trailing: ReactNode = (
    <ListTrailing
      refreshing={state.refreshing}
      fetchedAt={state.fetchedAt}
      onRefresh={() => {
        void runRefresh();
      }}
    />
  );
  if (view === "create") {
    title = <h1 className="text-[15px] font-semibold">Create repository</h1>;
    trailing = null;
  } else if (view === "picker") {
    title = <h1 className="text-[15px] font-semibold tracking-[-0.01em]">Select repositories</h1>;
    trailing = (
      <PickerTrailing
        dirty={pickerDirty}
        loading={state.catalogLoading}
        onCancel={goList}
        onSave={() => pickerSave.current()}
      />
    );
  } else if (view === "detail") {
    title = <DetailTitle fullName={state.detail?.fullName} onBack={goList} />;
    trailing = <DetailTrailing fullName={state.detail?.fullName} />;
  }

  return (
    <Chrome
      login={login}
      nav={nav}
      onNav={(id) => {
        if (!state.status?.ok) return;
        if (id === "create") navigate("/create");
        if (id === "overview") goList();
        if (id === "repos") navigate("/repos");
      }}
      trackedCount={state.selectedNames.length}
      title={title}
      trailing={trailing}
    >
      {view === "create" ? (
        <div className="h-full">
          <CreateBody />
        </div>
      ) : (
        <div className="t-page-slide" data-page={page}>
          <ListPage revealed />
          {view === "picker" || view === "detail" ? (
            <section className="t-page" data-page-id="2">
              {view === "picker" ? (
                <PickerBody />
              ) : (
                <DetailBody fullName={decodeDetailParam(detailParams?.fullName)} />
              )}
            </section>
          ) : null}
        </div>
      )}
    </Chrome>
  );
}

function ListPage({ revealed }: { revealed: boolean }) {
  const { state } = useStore();
  const [, navigate] = useLocation();
  return (
    <section className="t-page" data-page-id="1">
      <div className={`t-skel h-full ${revealed ? "is-revealed" : ""}`}>
        <div className="t-skel-skeleton is-pulsing">
          <ListSkeleton />
        </div>
        <div className="t-skel-content">
          <ListView
            repos={state.tracked}
            history={state.history}
            refreshing={state.refreshing}
            banner={state.banner}
            onOpenPicker={() => {
              navigate("/repos");
            }}
            onOpenRepo={(fullName) => {
              navigate(detailPath(fullName));
            }}
          />
        </div>
      </div>
    </section>
  );
}

function PickerBody() {
  const { state, persistSelection, setPickerDirty, pickerSave } = useStore();
  const [, navigate] = useLocation();
  const login = state.status?.login ?? null;
  useCatalog();
  return (
    <PickerView
      login={login}
      catalog={state.catalog}
      loading={state.catalogLoading && state.catalog.length === 0}
      error={state.catalogError}
      initialSelected={state.selectedNames}
      onCancel={() => {
        navigate("/");
      }}
      onSave={persistSelection}
      onDirtyChange={(dirty, save) => {
        setPickerDirty(dirty);
        pickerSave.current = save;
      }}
    />
  );
}

function DetailBody({ fullName }: { fullName: string }) {
  const { detail, loading, error } = useDetail(fullName);
  return (
    <div className={`t-skel h-full ${loading ? "" : "is-revealed"}`}>
      <div className="t-skel-skeleton is-pulsing">
        <DetailSkeleton />
      </div>
      <div className="t-skel-content">
        <DetailView loading={false} error={error} detail={detail} />
      </div>
    </div>
  );
}

function CreateBody() {
  const { state, handleCreated } = useStore();
  const [, navigate] = useLocation();
  const login = state.status?.login ?? null;
  return (
    <CreateView
      login={login}
      onCreated={handleCreated}
      onOverview={() => {
        navigate("/");
      }}
    />
  );
}
