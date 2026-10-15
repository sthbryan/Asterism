import { CACHE_TTL_MS } from "@/lib/cache";
import { createResourceCache } from "@/lib/resourceCache";
import type {
  CatalogRepo,
  CreateOptions,
  Diagnostics,
  GitSyncStatus,
  LocalCheckout,
  PullListResult,
  PullRequestDetail,
} from "@/lib/types";
import { readCache, writeCache } from "./index";

export function apiCache<T>(namespace: string, ttl: number) {
  return createResourceCache<T>(ttl, {
    read: (key) => readCache<T>(namespace, key),
    write: (key, entry) => writeCache(namespace, key, entry),
  });
}

export const pullListCache = apiCache<PullListResult>(
  "pull-list",
  CACHE_TTL_MS.pulls,
);
export const pullDetailCache = apiCache<PullRequestDetail>(
  "pull-detail",
  CACHE_TTL_MS.pulls,
);
export const pullDiffCache = apiCache<string>("pull-diff", CACHE_TTL_MS.pulls);
export const createOptionsCache = apiCache<CreateOptions>(
  "create-options",
  CACHE_TTL_MS.create,
);

// Local probes have short TTLs: cached state is display-only, never permission to mutate.
export const checkoutCache = apiCache<LocalCheckout[]>("checkouts", 5_000);
export const gitStatusCache = apiCache<GitSyncStatus>("git-status", 5_000);
export const diagnosticsCache = apiCache<Diagnostics>("diagnostics", 300_000);

export const catalogCache = apiCache<CatalogRepo[]>(
  "catalog",
  CACHE_TTL_MS.overview,
);
