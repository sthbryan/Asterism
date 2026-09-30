import { CACHE_TTL_MS } from "@/lib/cache";
import { createResourceCache } from "@/lib/resourceCache";
import type {
  CatalogRepo,
  CreateOptions,
  PullListResult,
  PullRequestDetail,
} from "@/lib/types";
import { readCache, writeCache } from "./index";

function apiCache<T>(namespace: string, ttl: number) {
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

export const catalogCache = apiCache<CatalogRepo[]>(
  "catalog",
  CACHE_TTL_MS.overview,
);
