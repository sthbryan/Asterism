import { useCallback, useEffect, useMemo, useState } from "react";
import { useResource } from "@/app/hooks/useResource";
import type { PullRequestSummary } from "@/lib/types";
import { loadMorePullRequests, refreshPullRequests } from "@/services/api";
import { pullListCache } from "@/services/api/resources";
import { appendPulls, mergePullResults } from "../utils";

type LoadedPages = {
  pulls: PullRequestSummary[];
  cursors: Record<string, string>;
  errors: Record<string, string>;
};

const EMPTY_PAGES: LoadedPages = { pulls: [], cursors: {}, errors: {} };

export function usePullList({
  account,
  repos,
  revision,
}: {
  account: string | null;
  repos: string[];
  revision: number;
}) {
  const scope = `${revision}:${account}`;
  const resource = JSON.stringify([...repos].sort());
  const fetch = useCallback(async () => {
    const saved = await refreshPullRequests({ repos });
    return {
      ...saved,
      data: mergePullResults(
        saved.data,
        pullListCache.peek(scope, resource)?.data,
      ),
    };
  }, [repos, scope, resource]);
  const state = useResource(pullListCache, resource, fetch);
  const saved = state.saved;
  const [pages, setPages] = useState<LoadedPages>(EMPTY_PAGES);
  const [loadingMore, setLoadingMore] = useState(false);

  // A refresh (or a different repository set) starts the cursors over.
  useEffect(() => {
    setPages({
      pulls: [],
      cursors: saved?.data.cursors ?? {},
      errors: {},
    });
    setLoadingMore(false);
  }, [saved]);

  const pulls = useMemo(
    () => appendPulls(saved?.data.pulls ?? [], pages.pulls),
    [saved, pages.pulls],
  );

  const loadMore = useCallback(async () => {
    if (loadingMore || Object.keys(pages.cursors).length === 0) return 0;
    setLoadingMore(true);
    try {
      const result = await loadMorePullRequests({ repos }, pages.cursors);
      setPages((prev) => ({
        pulls: appendPulls(prev.pulls, result.pulls),
        cursors: result.cursors ?? {},
        errors: result.errors,
      }));
      return result.pulls.length;
    } catch (err) {
      setPages((prev) => ({ ...prev, errors: { all: String(err) } }));
      return 0;
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, pages.cursors, repos]);

  return {
    ...state,
    pulls,
    errors: { ...(saved?.data.errors ?? {}), ...pages.errors },
    fetchedAt: saved?.fetchedAt ?? null,
    canLoadMore: Object.keys(pages.cursors).length > 0,
    loadingMore,
    loadMore,
  };
}

export function clearPullListCache() {
  pullListCache.clear();
}
export function invalidatePullListCache(_account: string | null) {
  pullListCache.clear();
}
