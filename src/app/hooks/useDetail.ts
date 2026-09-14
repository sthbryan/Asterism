import { useEffect } from "react";
import { useStore } from "@/app/store";

/** Load repo detail for fullName and merge history into the store. */
export function useDetail(fullName: string) {
  const revision = useStore((s) => s.dataRevision);
  const booted = useStore((s) => s.booted);
  const detail = useStore((s) => s.detail);
  const loading = useStore((s) => s.detailLoading);
  const error = useStore((s) => s.detailError);
  const fetchDetail = useStore((s) => s.fetchDetail);
  const clearDetail = useStore((s) => s.clearDetail);

  useEffect(() => {
    void revision;
    if (!fullName || !booted) return;
    void fetchDetail(fullName);
  }, [fullName, fetchDetail, revision, booted]);

  useEffect(() => {
    return () => {
      clearDetail();
    };
  }, [clearDetail]);

  return { detail, loading, error };
}
