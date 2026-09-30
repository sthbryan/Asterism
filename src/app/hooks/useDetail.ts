import { useEffect } from "react";
import { useStore } from "@/app/store";

/** Load repo detail for fullName (stale-while-revalidate) and merge history. */
export function useDetail(fullName: string) {
  const connecting = useStore((s) => s.connecting);
  const revision = useStore((s) => s.dataRevision);
  const detail = useStore((s) => s.detail);
  const loading = useStore((s) => s.detailLoading);
  const refreshing = useStore((s) => s.detailRefreshing);
  const error = useStore((s) => s.detailError);
  const fetchDetail = useStore((s) => s.fetchDetail);

  // biome-ignore lint/correctness/useExhaustiveDependencies: account hydration invalidates requests and must reload an open detail.
  useEffect(() => {
    if (!fullName || connecting) return;
    void fetchDetail(fullName);
  }, [fullName, fetchDetail, connecting, revision]);

  return {
    detail: detail?.fullName === fullName ? detail : null,
    loading,
    refreshing,
    error,
  };
}
