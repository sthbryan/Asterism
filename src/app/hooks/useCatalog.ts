import { useEffect } from "react";
import { useStore } from "@/app/store";

/** Ensure the repo catalog is loaded (picker entry point). */
export function useCatalog() {
  const catalog = useStore((s) => s.catalog);
  const catalogLoading = useStore((s) => s.catalogLoading);
  const catalogError = useStore((s) => s.catalogError);
  const loadCatalog = useStore((s) => s.loadCatalog);

  useEffect(() => {
    if (catalog.length === 0 && !catalogLoading && !catalogError) {
      void loadCatalog();
    }
  }, [catalog.length, catalogLoading, catalogError, loadCatalog]);
}
