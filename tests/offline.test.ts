import { afterEach, beforeEach, expect, mock, spyOn, test } from "bun:test";
import { useStore } from "../src/app/store";
import {
  MOCK_CACHE,
  MOCK_CATALOG,
  MOCK_CONFIG,
  mockDetail,
} from "../src/lib/mock";
import type { LocalState, RepoDetail, Saved } from "../src/lib/types";
import { tauriClient } from "../src/services/api/tauri";

const local = (account = "github.com/one"): LocalState => ({
  account,
  config: MOCK_CONFIG,
  cache: MOCK_CACHE,
  catalog: { fetchedAt: 100, data: MOCK_CATALOG, warning: null },
  legacyAvailable: false,
  dataPath: "/test/data",
});
const online = { ok: true, login: "one", error: null, hint: null };
const offline = {
  ok: false,
  login: null,
  error: "gh was not found",
  hint: null,
};
beforeEach(() => useStore.setState(useStore.getInitialState(), true));
afterEach(() => mock.restore());

test("local data remains usable when gh is absent and retry keeps it on screen", async () => {
  useStore.getState().hydrateLocal(local());
  useStore.getState().bootFail(offline);
  const refresh = spyOn(tauriClient, "refreshTracked");
  const catalog = spyOn(tauriClient, "listCatalog");
  await useStore.getState().runRefresh();
  await useStore.getState().loadCatalog();
  expect(refresh).not.toHaveBeenCalled();
  expect(catalog).not.toHaveBeenCalled();
  expect(useStore.getState().tracked).toEqual(MOCK_CACHE.repos);
  expect(useStore.getState().fetchedAt).toBe(MOCK_CACHE.fetchedAt);
  useStore.getState().retryBoot();
  expect(useStore.getState().booted).toBe(true);
  expect(useStore.getState().tracked).toEqual(MOCK_CACHE.repos);
});

test("offline detail reads request cached data and preserve the acquisition timestamp", async () => {
  useStore.getState().hydrateLocal(local());
  useStore.getState().bootFail(offline);
  const data = mockDetail("sthbryan/hyperion");
  const detail = spyOn(tauriClient, "getRepoDetail").mockResolvedValue({
    data,
    fetchedAt: 100,
    warning: null,
  });
  await useStore.getState().fetchDetail(data.fullName);
  expect(detail).toHaveBeenCalledWith(data.fullName, true);
  expect(useStore.getState().detailFetchedAt).toBe(100);
  expect(useStore.getState().detail?.views).toEqual(data.views);
});

test("uncached detail finishes with an error, without fabricated metrics", async () => {
  useStore.getState().hydrateLocal({ ...local(), cache: null });
  useStore.getState().bootFail(offline);
  spyOn(tauriClient, "getRepoDetail").mockRejectedValue("not saved");
  await useStore.getState().fetchDetail("one/new");
  expect(useStore.getState().detail).toBeNull();
  expect(useStore.getState().detailLoading).toBe(false);
  expect(useStore.getState().detailFetchedAt).toBeNull();
  expect(useStore.getState().detailError).toBe("not saved");
});

test("late responses cannot restore a previous account's private detail", async () => {
  useStore.getState().hydrateLocal(local());
  useStore.getState().bootFail(online);
  let resolve!: (saved: Saved<RepoDetail>) => void;
  spyOn(tauriClient, "getRepoDetail").mockImplementation(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const request = useStore.getState().fetchDetail("one/private");
  useStore.getState().hydrateLocal({
    ...local("github.com/two"),
    cache: null,
    catalog: null,
    config: { version: 1, repos: [] },
  });
  resolve({ data: mockDetail("one/private"), fetchedAt: 123, warning: null });
  await request;
  expect(useStore.getState().account).toBe("github.com/two");
  expect(useStore.getState().detail).toBeNull();
  expect(useStore.getState().tracked).toEqual([]);
  expect(useStore.getState().catalog).toEqual([]);
  expect(useStore.getState().history).toEqual({});
});

test("failed refresh preserves saved values and reconnect allows a later refresh", async () => {
  useStore.getState().hydrateLocal(local());
  useStore.getState().bootFail(online);
  const refresh = spyOn(tauriClient, "refreshTracked").mockRejectedValue(
    "network failed",
  );
  spyOn(tauriClient, "getStatus").mockResolvedValue(offline);
  await useStore.getState().runRefresh();
  expect(useStore.getState().status?.ok).toBe(false);
  expect(useStore.getState().tracked).toEqual(MOCK_CACHE.repos);
  expect(useStore.getState().fetchedAt).toBe(MOCK_CACHE.fetchedAt);
  useStore.getState().bootFail(online);
  refresh.mockResolvedValue({ ...MOCK_CACHE, fetchedAt: 999 });
  await useStore.getState().runRefresh();
  expect(useStore.getState().fetchedAt).toBe(999);
});

test("failed catalog refresh retains the last saved list and date", async () => {
  useStore.getState().hydrateLocal(local());
  useStore.getState().bootFail(online);
  spyOn(tauriClient, "listCatalog").mockRejectedValue("offline");
  await useStore.getState().loadCatalog();
  expect(useStore.getState().catalog).toEqual(MOCK_CATALOG);
  expect(useStore.getState().catalogFetchedAt).toBe(100);
  expect(useStore.getState().catalogError).toBe("offline");
});
