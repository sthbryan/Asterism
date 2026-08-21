export function fmtNum(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US").format(n);
}

export function fmtBytes(n: number) {
  if (n < 1024) return `${fmtNum(n)} B`;
  const kb = n / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : fmtNum(Math.round(kb))} KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : fmtNum(Math.round(mb))} MB`;
  const gb = mb / 1024;
  return `${gb < 10 ? gb.toFixed(1) : fmtNum(Math.round(gb))} GB`;
}

export function fmtRepoSizeKb(kb: number) {
  return fmtBytes(kb * 1024);
}

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function fmtFetched(unix: number | null | undefined) {
  if (!unix) return null;
  const d = new Date(unix * 1000);
  return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
