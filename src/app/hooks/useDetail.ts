import { useEffect } from "react";
import { useStore } from "@/app/store";

/** Load repo detail for fullName (stale-while-revalidate) and merge history. */
export function useDetail(fullName: string) {
  const booted = useStore((s) => s.booted);
  const detail = useStore((s) => s.detail);
  const loading = useStore((s) => s.detailLoading);
  const refreshing = useStore((s) => s.detailRefreshing);
  const error = useStore((s) => s.detailError);
  const fetchDetail = useStore((s) => s.fetchDetail);
  const clearDetail = useStore((s) => s.clearDetail);

  useEffect(() => {
    if (!fullName || !booted) return;
    clearDetail();
    void fetchDetail(fullName);
    return () => {
      clearDetail();
    };
  }, [fullName, fetchDetail, clearDetail, booted]);

  return { detail, loading, refreshing, error };
}
