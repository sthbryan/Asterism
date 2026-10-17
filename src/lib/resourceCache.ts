import { isCacheFresh } from "./cache";
import type { PersistentCache, Saved } from "./types";

type Storage<T> = {
  read: (key: string, resource: string) => Promise<PersistentCache<T> | null>;
  write: (
    key: string,
    entry: PersistentCache<T>,
    resource: string,
  ) => Promise<void>;
};

const caches = new Set<() => void>();

export function clearResourceCaches() {
  for (const clear of caches) clear();
}

export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error("Request timed out.")), ms);
    }),
  ]).finally(() => clearTimeout(timer));
}

// Hash resource keys so a long repository selection fits the disk filename limit.
async function diskKey(resource: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(resource),
  );
  return `v1:${Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

/** Account/revision-scoped memory, bounded disk reads, and shared network requests. */
export function createResourceCache<T>(ttlMs: number, storage: Storage<T>) {
  const memory = new Map<string, Saved<T>>();
  const pending = new Map<string, Promise<Saved<T>>>();
  const reads = new Map<string, Promise<PersistentCache<T> | null>>();
  const remember = (key: string, saved: Saved<T>) => {
    memory.delete(key);
    memory.set(key, saved);
    // Bounded per-resource snapshots; older entries remain available on disk.
    if (memory.size > 128) memory.delete(memory.keys().next().value as string);
  };
  let generation = 0;
  const id = (scope: string, resource: string) =>
    JSON.stringify([scope, resource]);
  const clear = () => {
    generation += 1;
    memory.clear();
    pending.clear();
    reads.clear();
  };
  caches.add(clear);

  return {
    peek: (scope: string, resource: string) => memory.get(id(scope, resource)),
    clear,
    async load(
      scope: string,
      resource: string,
      fetch: () => Promise<Saved<T>>,
      options: {
        isCurrent: () => boolean;
        onCached: (saved: Saved<T>) => void;
        force?: boolean;
      },
    ): Promise<Saved<T>> {
      const key = id(scope, resource);
      const epoch = generation;
      const current = () => epoch === generation && options.isCurrent();
      let saved = memory.get(key);
      let hash: Promise<string> | null = null;
      const persistedKey = () => (hash ??= diskKey(resource));
      if (!saved && current()) {
        let read = reads.get(key);
        if (!read) {
          read = withTimeout(
            persistedKey().then((key) => storage.read(key, resource)),
            1_000,
          ).catch(() => null);
          reads.set(key, read);
        }
        const entry = await read;
        if (reads.get(key) === read) reads.delete(key);
        saved = memory.get(key) ?? (entry?.version === 1 ? entry : undefined);
        if (saved && current()) remember(key, saved);
      }
      if (!current()) throw new Error("Account or cache changed.");
      if (saved) {
        options.onCached(saved);
        if (!options.force && isCacheFresh(saved.fetchedAt, ttlMs))
          return saved;
      }
      let request = pending.get(key);
      if (!request) {
        request = (async () => {
          const target = await persistedKey();
          const result = await withTimeout(fetch(), 90_000);
          if (current()) {
            remember(key, result);
            // Persistence is best-effort; a disk error keeps the memory result usable.
            void storage
              .write(target, { version: 1, ...result }, resource)
              .catch(() => undefined);
          }
          return result;
        })();
        pending.set(key, request);
      }
      try {
        const result = await request;
        if (!current()) throw new Error("Account or cache changed.");
        return result;
      } finally {
        if (pending.get(key) === request) pending.delete(key);
      }
    },
  };
}
