import { useEffect } from "react";
import { useStore } from "@/app/store";

export function useCatalog() {
  const ready = useStore(
    (state) => !state.connecting && Boolean(state.status?.ok),
  );
  const revision = useStore((state) => state.dataRevision);
  const loadCatalog = useStore((state) => state.loadCatalog);
  // biome-ignore lint/correctness/useExhaustiveDependencies: account hydration must reload the catalog.
  useEffect(() => {
    if (ready) void loadCatalog();
  }, [ready, revision, loadCatalog]);
}
