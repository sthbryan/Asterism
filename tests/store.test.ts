import { beforeEach, describe, expect, test } from "bun:test";
import { useStore } from "../src/app/store";

describe("store (Zustand)", () => {
  beforeEach(() => {
    useStore.setState({
      bootAttempt: 0,
      booted: false,
      status: null,
      tracked: [],
      history: {},
      selectedNames: [],
      fetchedAt: null,
      refreshing: false,
      banner: null,
      preferenceError: null,
      catalog: [],
      catalogLoading: false,
      catalogError: null,
      detail: null,
      detailLoading: false,
      detailError: null,
    });
  });

  test("initial state initializes correctly", () => {
    const state = useStore.getState();
    expect(state.booted).toBe(false);
    expect(state.tracked).toEqual([]);
    expect(state.selectedNames).toEqual([]);
    expect(state.refreshing).toBe(false);
  });

  test("bootOk updates booted, status, and config without cached data", () => {
    const mockStatus = { ok: true, login: "octocat", hint: null, error: null };
    const mockConfig = {
      version: 1,
      repos: ["owner/repo1", "owner/repo2"],
      theme: "dark" as const,
      transparency: true,
      locale: "es" as const,
    };
    useStore.getState().bootOk(mockStatus, mockConfig);

    const state = useStore.getState();
    expect(state.booted).toBe(true);
    expect(state.status).toEqual(mockStatus);
    expect(state.selectedNames).toEqual(["owner/repo1", "owner/repo2"]);
    expect(state.tracked).toEqual([]);
    expect(state.fetchedAt).toBeNull();
  });

  test("bootFail updates booted and error status", () => {
    const mockFailStatus = {
      ok: false,
      login: null,
      hint: "login first",
      error: "auth failure",
    };
    useStore.getState().bootFail(mockFailStatus);

    const state = useStore.getState();
    expect(state.booted).toBe(true);
    expect(state.status?.ok).toBe(false);
    expect(state.status?.error).toBe("auth failure");
  });

  test("setBanner updates banner message", () => {
    useStore.getState().setBanner("Network timeout");
    expect(useStore.getState().banner).toBe("Network timeout");
    useStore.getState().setBanner(null);
    expect(useStore.getState().banner).toBeNull();
  });

  test("clearDetail resets detail and error", () => {
    useStore.setState({
      detail: {
        fullName: "owner/repo",
        description: null,
        stars: 5,
        forks: 1,
        downloads: 0,
        openIssues: 0,
        license: null,
        defaultBranch: "main",
        pushedAt: 123,
        releases: [],
        platforms: [],
        starHistory: [],
        downloadHistory: [],
      },
      detailLoading: true,
      detailError: "some error",
    });

    useStore.getState().clearDetail();
    const state = useStore.getState();
    expect(state.detail).toBeNull();
    expect(state.detailLoading).toBe(false);
    expect(state.detailError).toBeNull();
  });
});
