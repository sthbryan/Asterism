import { describe, expect, mock, test } from "bun:test";
import { createResourceCache, withTimeout } from "../src/lib/resourceCache";
import type { PersistentCache, Saved } from "../src/lib/types";

const snapshot = (data: string, fetchedAt = Date.now()): Saved<string> => ({
  data,
  fetchedAt,
  warning: null,
});
const controls = () => ({
  isCurrent: () => true,
  onCached: mock((_saved: Saved<string>) => {}),
});
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  return {
    promise: new Promise<T>((done) => {
      resolve = done;
    }),
    resolve: (value: T) => resolve(value),
  };
};

function cacheFor(entry: PersistentCache<string> | null = null) {
  const read = mock(async () => entry);
  const write = mock(async () => {});
  return {
    cache: createResourceCache<string>(60_000, { read, write }),
    read,
    write,
  };
}

describe("resource loading", () => {
  test("fresh persisted data opens without contacting GitHub; force refresh still fetches", async () => {
    const { cache, read, write } = cacheFor({
      version: 1,
      ...snapshot("disk"),
    });
    const fetch = mock(async () => snapshot("network"));
    expect(
      (await cache.load("account-a", "repo", fetch, controls())).data,
    ).toBe("disk");
    expect(fetch).not.toHaveBeenCalled();
    await cache.load("account-a", "repo", fetch, controls());
    expect(read).toHaveBeenCalledTimes(1);
    expect(
      (
        await cache.load("account-a", "repo", fetch, {
          ...controls(),
          force: true,
        })
      ).data,
    ).toBe("network");
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(write).toHaveBeenCalledTimes(1);
  });

  test("stale data appears before a shared refresh finishes and survives a network failure", async () => {
    const old = snapshot("saved", Date.now() - 120_000);
    const { cache } = cacheFor({ version: 1, ...old });
    const network = deferred<Saved<string>>();
    const shown = deferred<Saved<string>>();
    const fetch = mock(() => network.promise);
    const first = cache.load("a", "repo", fetch, {
      ...controls(),
      onCached: shown.resolve,
    });
    expect((await shown.promise).data).toBe("saved");
    const second = cache.load("a", "repo", fetch, controls());
    await Bun.sleep(5);
    expect(fetch).toHaveBeenCalledTimes(1);
    network.resolve(snapshot("fresh"));
    expect((await first).data).toBe("fresh");
    expect((await second).data).toBe("fresh");
    await expect(
      cache.load(
        "a",
        "repo",
        async () => {
          throw new Error("offline");
        },
        { ...controls(), force: true },
      ),
    ).rejects.toThrow("offline");
    expect(cache.peek("a", "repo")?.data).toBe("fresh");
  });

  test("a corrupt disk entry cannot prevent a fetch, and long keys stay safe on disk", async () => {
    const read = mock(async () => {
      throw new Error("corrupt");
    });
    const write = mock(
      async (_key: string, _entry: PersistentCache<string>) => {},
    );
    const cache = createResourceCache<string>(60_000, { read, write });
    await cache.load(
      "a",
      "owner/repository,".repeat(100),
      async () => snapshot("fresh"),
      controls(),
    );
    expect(write.mock.calls[0][0]).toMatch(/^v1:[a-f0-9]{64}$/);
  });

  test("account changes and clearing the cache discard late responses", async () => {
    const { cache, write } = cacheFor();
    const network = deferred<Saved<string>>();
    const started = deferred<boolean>();
    let current = true;
    const request = cache.load(
      "a",
      "repo",
      () => {
        started.resolve(true);
        return network.promise;
      },
      { ...controls(), isCurrent: () => current },
    );
    await started.promise;
    current = false;
    network.resolve(snapshot("account-a-data"));
    await expect(request).rejects.toThrow("changed");
    expect(cache.peek("a", "repo")).toBeUndefined();
    expect(cache.peek("b", "repo")).toBeUndefined();
    expect(write).not.toHaveBeenCalled();

    const later = deferred<Saved<string>>();
    const startedAgain = deferred<boolean>();
    const pending = cache.load(
      "a",
      "repo",
      () => {
        startedAgain.resolve(true);
        return later.promise;
      },
      controls(),
    );
    await startedAgain.promise;
    cache.clear();
    later.resolve(snapshot("late"));
    await expect(pending).rejects.toThrow("changed");
    expect(cache.peek("a", "repo")).toBeUndefined();
    expect(write).not.toHaveBeenCalled();
  });

  test("unresponsive storage is bounded so the network request can proceed", async () => {
    const read = () => new Promise<null>(() => {});
    const cache = createResourceCache<string>(60_000, {
      read,
      write: async () => {},
    });
    expect(
      (
        await cache.load(
          "a",
          "repo",
          async () => snapshot("network"),
          controls(),
        )
      ).data,
    ).toBe("network");
    await expect(withTimeout(new Promise(() => {}), 5)).rejects.toThrow(
      "timed out",
    );
  });
});
