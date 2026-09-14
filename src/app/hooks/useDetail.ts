import { useEffect } from "react";
import { useStore } from "@/app/store";

/** Load repo detail for fullName and merge history into the store. */
export function useDetail(fullName: string) {
  const detail = useStore((s) => s.detail);
  const loading = useStore((s) => s.detailLoading);
  const error = useStore((s) => s.detailError);
  const fetchDetail = useStore((s) => s.fetchDetail);
  const clearDetail = useStore((s) => s.clearDetail);

  useEffect(() => {
    if (!fullName) return;
    void fetchDetail(fullName);
  }, [fullName, fetchDetail]);

  useEffect(() => {
    return () => {
      clearDetail();
    };
  }, [clearDetail]);

  return { detail, loading, error };
}
