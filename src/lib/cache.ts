/** Default freshness window for data that can be shown stale while refreshing. */
export const CACHE_TTL_MS = {
  detail: 60_000,
  overview: 60_000,
} as const;

export type CacheNamespace = keyof typeof CACHE_TTL_MS;

export function isCacheFresh(
  fetchedAt: number,
  ttlMs: number,
  now = Date.now(),
): boolean {
  return Number.isFinite(fetchedAt) && now - fetchedAt < ttlMs;
}

/** Stable versioned resource key. The namespace is passed separately to storage. */
export function cacheKey(namespace: string, resource?: string): string {
  return resource ? `v1:${encodeURIComponent(resource)}` : `${namespace}:v1`;
}
