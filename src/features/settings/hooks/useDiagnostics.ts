import { useResource } from "@/app/hooks/useResource";
import { getDiagnostics } from "@/services/api";
import { diagnosticsCache } from "@/services/api/resources";

async function fetchDiagnostics() {
  return {
    data: await getDiagnostics(),
    fetchedAt: Math.floor(Date.now() / 1_000),
    warning: null,
  };
}

export function useDiagnostics() {
  const state = useResource(
    diagnosticsCache,
    "tools",
    fetchDiagnostics,
    true,
    true,
  );
  return {
    diagnostics: state.saved?.data ?? null,
    error: state.error,
    loading: state.loading || state.refreshing,
    retry: state.refresh,
  };
}
