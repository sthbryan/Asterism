import { afterEach, beforeEach, expect, mock, spyOn, test } from "bun:test";
import { useStore } from "../src/app/store";
import { mockDetail } from "../src/lib/mock/fixtures";
import { clearResourceCaches } from "../src/lib/resourceCache";
import type { RepoDetail, Saved } from "../src/lib/types";
import { tauriClient } from "../src/services/api/tauri";

const saved = (name: string): Saved<RepoDetail> => ({
  data: mockDetail(name),
  fetchedAt: Date.now(),
  warning: null,
});

beforeEach(() => {
  clearResourceCaches();
  useStore.setState(useStore.getInitialState(), true);
  useStore.setState({
    account: "github.com/one",
    connecting: false,
    status: { ok: true, login: "one", error: null, hint: null },
  });
  spyOn(tauriClient, "readCache").mockResolvedValue(null);
  spyOn(tauriClient, "writeCache").mockResolvedValue(undefined);
});
afterEach(() => mock.restore());

test("A → B → A navigation shares pending requests and only displays the latest selection", async () => {
  const resolves = new Map<string, (value: Saved<RepoDetail>) => void>();
  const fetch = spyOn(tauriClient, "getRepoDetail").mockImplementation(
    (name) => new Promise((resolve) => resolves.set(name, resolve)),
  );
  const first = useStore.getState().fetchDetail("one/a");
  await Bun.sleep(5);
  const second = useStore.getState().fetchDetail("one/b");
  await Bun.sleep(5);
  const last = useStore.getState().fetchDetail("one/a");
  await Bun.sleep(5);
  resolves.get("one/b")?.(saved("one/b"));
  await second;
  expect(useStore.getState().detail).toBeNull();
  resolves.get("one/a")?.(saved("one/a"));
  await Promise.all([first, last]);
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(useStore.getState().detail?.fullName).toBe("one/a");
  await useStore.getState().fetchDetail("one/b");
  expect(fetch).toHaveBeenCalledTimes(2);
  expect(useStore.getState().detail?.fullName).toBe("one/b");
});

test("fresh detail displays synchronously and a failed forced refresh retains it", async () => {
  const fetch = spyOn(tauriClient, "getRepoDetail").mockResolvedValue(
    saved("one/a"),
  );
  await useStore.getState().fetchDetail("one/a");
  useStore.getState().clearDetail();
  const returning = useStore.getState().fetchDetail("one/a");
  expect(useStore.getState().detail?.fullName).toBe("one/a");
  await returning;
  expect(fetch).toHaveBeenCalledTimes(1);
  fetch.mockRejectedValue("offline");
  await useStore.getState().fetchDetail("one/a", true);
  expect(useStore.getState().detail?.fullName).toBe("one/a");
  expect(useStore.getState().detailRefreshing).toBe(false);
});

test("a late repository result cannot update a different account", async () => {
  let resolve!: (value: Saved<RepoDetail>) => void;
  spyOn(tauriClient, "getRepoDetail").mockImplementation(
    () =>
      new Promise((done) => {
        resolve = done;
      }),
  );
  const request = useStore.getState().fetchDetail("one/a");
  await Bun.sleep(5);
  useStore.setState({ account: "github.com/two", dataRevision: 1 });
  resolve(saved("one/a"));
  await request;
  expect(useStore.getState().detail).toBeNull();
  expect(useStore.getState().detailCache).toEqual({});
  expect(tauriClient.writeCache).not.toHaveBeenCalled();
});

test("an empty catalog is cached and repeated entries do not contact GitHub", async () => {
  const fetch = spyOn(tauriClient, "listCatalog").mockResolvedValue([]);
  await useStore.getState().loadCatalog();
  await useStore.getState().loadCatalog();
  expect(fetch).toHaveBeenCalledTimes(1);
  expect(useStore.getState().catalogFetchedAt).not.toBeNull();
});

test("a fresh overview in memory needs no disk read or network request", async () => {
  useStore.setState({
    selectedNames: ["one/a"],
    tracked: [{ ...mockDetail("one/a"), fetchedAt: Date.now() }],
    fetchedAt: Date.now(),
  });
  const fetch = spyOn(tauriClient, "refreshTracked");
  await useStore.getState().runRefresh();
  expect(fetch).not.toHaveBeenCalled();
  expect(tauriClient.readCache).not.toHaveBeenCalled();
});
