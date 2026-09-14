export function isMockMode(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.has("mock") || params.has("screenshot")) return true;
  try {
    if (window.localStorage?.getItem("asterism:mock") === "1") return true;
  } catch {
    /* ignore */
  }
  return import.meta.env.VITE_MOCK === "1";
}
