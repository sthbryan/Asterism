const RAIL_KEY = "asterism:rail";

/** Rail width is a per-device view preference, read before the first paint. */
export function readRailCollapsed(): boolean {
  try {
    return window.localStorage.getItem(RAIL_KEY) === "collapsed";
  } catch {
    return false;
  }
}

export function saveRailCollapsed(collapsed: boolean) {
  try {
    window.localStorage.setItem(RAIL_KEY, collapsed ? "collapsed" : "expanded");
  } catch {
    /* ignore */
  }
}
