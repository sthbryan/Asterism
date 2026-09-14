import { currentLocale } from "./i18n/locale";
export function fmtNum(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat(currentLocale()).format(n);
}

export function fmtSigned(n: number) {
  if (n > 0) return `+${fmtNum(n)}`;
  if (n < 0) return fmtNum(n);
  return "0";
}

export function fmtCompact(n: number | null | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return new Intl.NumberFormat(currentLocale(), {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(n);
}

export function fmtBytes(n: number) {
  if (n < 1024) return `${fmtNum(n)} B`;
  const kb = n / 1024;
  if (kb < 1024)
    return `${kb < 10 ? new Intl.NumberFormat(currentLocale(), { maximumFractionDigits: 1 }).format(kb) : fmtNum(Math.round(kb))} KB`;
  const mb = kb / 1024;
  if (mb < 1024)
    return `${mb < 10 ? new Intl.NumberFormat(currentLocale(), { maximumFractionDigits: 1 }).format(mb) : fmtNum(Math.round(mb))} MB`;
  const gb = mb / 1024;
  return `${gb < 10 ? new Intl.NumberFormat(currentLocale(), { maximumFractionDigits: 1 }).format(gb) : fmtNum(Math.round(gb))} GB`;
}

export function fmtRepoSizeKb(kb: number) {
  return fmtBytes(kb * 1024);
}

export function fmtDate(iso: string | null | undefined) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(currentLocale(), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function fmtFetched(unix: number | null | undefined) {
  if (!unix) return null;
  const d = new Date(unix * 1000);
  return d.toLocaleTimeString(currentLocale(), {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function fmtAxisDate(unix: number) {
  const d = new Date(unix * 1000);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(currentLocale(), {
    day: "numeric",
    month: "short",
  });
}

export function fmtAxisDateLong(unix: number) {
  const d = new Date(unix * 1000);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(currentLocale(), {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const BARE_HOST =
  /^(www\.)?[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+([/:?#].*)?$/i;

export function hrefFromMaybeUrl(
  raw: string | null | undefined,
): string | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  let candidate = value;
  if (!/^https?:\/\//i.test(value)) {
    if (value.startsWith("//")) candidate = `https:${value}`;
    else if (BARE_HOST.test(value)) candidate = `https://${value}`;
    else return null;
  }

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}
