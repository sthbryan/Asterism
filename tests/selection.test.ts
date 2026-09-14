import { afterEach, beforeEach, expect, mock, spyOn, test } from "bun:test";
import { useStore } from "../src/app/store";
import { MOCK_CACHE } from "../src/lib/mock";
import type { Config, LocalState } from "../src/lib/types";
import { tauriClient } from "../src/services/api/tauri";

const online = { ok: true, login: "one", error: null, hint: null };

const local = (repos: string[]): LocalState => ({
  account: "github.com/one",
  config: { version: 1, repos },
  cache: null,
  catalog: null,
  legacyAvailable: false,
  dataPath: "/test/data",
});

beforeEach(() => useStore.setState(useStore.getInitialState(), true));
afterEach(() => mock.restore());

test("persistSelection waits for the config write before completing", async () => {
  useStore.setState({
    account: "github.com/one",
    connecting: false,
    selectedNames: ["one/old"],
    status: online,
  });
  let resolveSave!: (config: Config) => void;
  const save = spyOn(tauriClient, "saveConfig").mockImplementation(
    () => new Promise((resolve) => (resolveSave = resolve)),
  );
  spyOn(tauriClient, "refreshTracked").mockResolvedValue({
    ...MOCK_CACHE,
    repos: [],
    history: {},
  });

  let complete = false;
  const pending = useStore
    .getState()
    .persistSelection(["one/new"])
    .then(() => {
      complete = true;
    });

  expect(save).toHaveBeenCalledWith(["one/new"]);
  expect(useStore.getState().selectedNames).toEqual(["one/new"]);
  expect(complete).toBe(false);

  resolveSave({ version: 1, repos: ["one/new"] });
  await pending;

  expect(complete).toBe(true);
  expect(useStore.getState().selectedNames).toEqual(["one/new"]);
});

test("persistSelection reapplies a confirmed write after same-account hydration", async () => {
  useStore.setState({
    account: "github.com/one",
    connecting: false,
    selectedNames: [],
    status: online,
  });
  let resolveSave!: (config: Config) => void;
  spyOn(tauriClient, "saveConfig").mockImplementation(
    () => new Promise((resolve) => (resolveSave = resolve)),
  );
  spyOn(tauriClient, "refreshTracked").mockResolvedValue({
    ...MOCK_CACHE,
    repos: [],
    history: {},
  });

  const pending = useStore.getState().persistSelection(["one/new"]);
  useStore.getState().hydrateLocal(local([]));
  resolveSave({ version: 1, repos: ["one/new"] });
  await pending;

  expect(useStore.getState().selectedNames).toEqual(["one/new"]);
});

test("persistSelection keeps the previous selection and rejects save errors", async () => {
  useStore.setState({
    account: "github.com/one",
    connecting: false,
    selectedNames: ["one/old"],
    status: online,
  });
  spyOn(tauriClient, "saveConfig").mockRejectedValue("disk full");

  let error: unknown;
  try {
    await useStore.getState().persistSelection(["one/new"]);
  } catch (err) {
    error = err;
  }

  expect(error).toBe("disk full");
  expect(useStore.getState().selectedNames).toEqual(["one/old"]);
  expect(useStore.getState().banner).toBe("disk full");
});
