import { useCallback, useState } from "react";
import { useResource } from "@/app/hooks/useResource";
import { getPullDiff, getPullRequest } from "@/services/api";
import { pullDetailCache, pullDiffCache } from "@/services/api/resources";

export function usePullDetail({
  account,
  repo,
  number,
  revision,
}: {
  account: string | null;
  repo: string;
  number: number;
  revision: number;
}) {
  const key = `${revision}:${account}:${repo}#${number}`;
  const resource = `${repo}#${number}`;
  const [panels, setPanels] = useState({
    key,
    filesOpen: false,
    diffOpen: false,
  });
  const current =
    panels.key === key ? panels : { key, filesOpen: false, diffOpen: false };
  const fetch = useCallback(() => getPullRequest(repo, number), [repo, number]);
  const fetchDiff = useCallback(
    () => getPullDiff(repo, number),
    [repo, number],
  );
  const detail = useResource(pullDetailCache, resource, fetch);
  const diff = useResource(
    pullDiffCache,
    resource,
    fetchDiff,
    current.diffOpen,
  );
  return {
    ...detail,
    pull: detail.saved?.data ?? null,
    fetchedAt: detail.saved?.fetchedAt ?? null,
    warning: detail.saved?.warning ?? null,
    filesOpen: current.filesOpen,
    diffOpen: current.diffOpen,
    diff: diff.saved,
    diffLoading: diff.loading,
    diffRefreshing: diff.refreshing,
    diffError: diff.error,
    toggleFiles: () => setPanels({ ...current, filesOpen: !current.filesOpen }),
    toggleDiff: () => setPanels({ ...current, diffOpen: !current.diffOpen }),
  };
}

export function clearPullDetailCache() {
  pullDetailCache.clear();
  pullDiffCache.clear();
}
