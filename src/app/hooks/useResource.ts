import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "@/app/store";
import type { createResourceCache } from "@/lib/resourceCache";
import type { Saved } from "@/lib/types";

/** Show saved data immediately; refresh once per resource, account and revision. */
export function useResource<T>(
  cache: ReturnType<typeof createResourceCache<T>>,
  resource: string,
  fetch: () => Promise<Saved<T>>,
  enabled = true,
) {
  const account = useStore((state) => state.account);
  const revision = useStore((state) => state.dataRevision);
  const ready = useStore(
    (state) =>
      !state.connecting && Boolean(state.status?.ok) && Boolean(state.account),
  );
  const scope = `${revision}:${account}`;
  const key = JSON.stringify([scope, resource]);
  const requestRef = useRef(0);
  const [state, setState] = useState(() => ({
    key,
    saved: cache.peek(scope, resource) ?? null,
    loading: enabled && !cache.peek(scope, resource),
    refreshing: false,
    error: null as string | null,
  }));

  const load = useCallback(
    async (force = false) => {
      if (!enabled || !ready) return;
      const request = ++requestRef.current;
      const isCurrent = () =>
        account === useStore.getState().account &&
        revision === useStore.getState().dataRevision;
      const alive = () => request === requestRef.current && isCurrent();
      const cached = cache.peek(scope, resource) ?? null;
      setState({
        key,
        saved: cached,
        loading: !cached,
        refreshing: Boolean(cached),
        error: null,
      });
      const apply = (saved: Saved<T>, refreshing: boolean) => {
        if (alive())
          setState({ key, saved, loading: false, refreshing, error: null });
      };
      try {
        const saved = await cache.load(scope, resource, fetch, {
          force,
          isCurrent,
          onCached: (saved) => apply(saved, true),
        });
        apply(saved, false);
      } catch (err) {
        if (alive())
          setState((state) => ({
            ...state,
            loading: false,
            refreshing: false,
            error: state.saved ? null : String(err),
          }));
      }
    },
    [account, revision, scope, key, resource, cache, fetch, enabled, ready],
  );

  useEffect(() => {
    void load();
    return () => {
      requestRef.current += 1;
    };
  }, [load]);

  const current =
    state.key === key
      ? state
      : {
          key,
          saved: cache.peek(scope, resource) ?? null,
          loading: enabled,
          refreshing: false,
          error: null,
        };
  return { ...current, refresh: () => load(true) };
}
