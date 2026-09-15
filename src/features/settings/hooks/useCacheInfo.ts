import { useCallback, useEffect, useState } from "react";
import type { CacheInfo } from "@/lib/types";
import { clearCache, getCacheInfo } from "@/services/api";

export function useCacheInfo() {
  const [info, setInfo] = useState<CacheInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setInfo(await getCacheInfo());
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const clear = useCallback(async () => {
    setClearing(true);
    setError(null);
    setNotice(false);
    try {
      await clearCache();
      setNotice(true);
      await refresh();
    } catch (err) {
      setError(String(err));
    } finally {
      setClearing(false);
    }
  }, [refresh]);

  return { info, loading, clearing, error, notice, refresh, clear };
}
