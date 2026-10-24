import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/app/store";
import type { CacheInfo } from "@/lib/types";
import { clearCache, getCacheInfo } from "@/services/api";

export function useCacheInfo() {
  const account = useStore((state) => state.account);
  const revision = useStore((state) => state.dataRevision);
  const generation = useRef(0);
  const [info, setInfo] = useState<CacheInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState(false);

  const refresh = useCallback(async () => {
    const request = ++generation.current;
    const current = () =>
      request === generation.current &&
      account === useStore.getState().account &&
      revision === useStore.getState().dataRevision;
    setLoading(true);
    setError(null);
    try {
      const next = await getCacheInfo();
      if (current()) setInfo(next);
    } catch (err) {
      if (current()) setError(String(err));
    } finally {
      if (current()) setLoading(false);
    }
  }, [account, revision]);

  useEffect(() => {
    setInfo(null);
    setNotice(false);
    setClearing(false);
    if (account) void refresh();
    else setLoading(false);
    return () => {
      // Bumping the generation on cleanup cancels work started by this effect.
      // oxlint-disable-next-line react-hooks/exhaustive-deps
      generation.current++;
    };
  }, [refresh, account]);

  const clear = useCallback(async () => {
    const current = () =>
      account === useStore.getState().account &&
      revision === useStore.getState().dataRevision;
    setClearing(true);
    setError(null);
    setNotice(false);
    try {
      await clearCache();
      if (current()) {
        setNotice(true);
        await refresh();
      }
    } catch (err) {
      if (current()) setError(String(err));
    } finally {
      if (current()) setClearing(false);
    }
  }, [refresh, account, revision]);

  return { info, loading, clearing, error, notice, refresh, clear };
}
