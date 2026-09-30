import { useCallback } from "react";
import { useResource } from "@/app/hooks/useResource";
import { refreshPullRequests } from "@/services/api";
import { pullListCache } from "@/services/api/resources";
import { mergePullResults } from "../utils";

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
  return {
    ...state,
    pulls: state.saved?.data.pulls ?? [],
    errors: state.saved?.data.errors ?? {},
    fetchedAt: state.saved?.fetchedAt ?? null,
  };
}

export function clearPullListCache() {
  pullListCache.clear();
}
export function invalidatePullListCache(_account: string | null) {
  pullListCache.clear();
}
