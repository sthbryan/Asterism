import { When } from "react-if";
import { useI18n } from "@/app/hooks";
import { Button } from "@/components/Button";
import { useCacheInfo } from "../hooks/useCacheInfo";

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 1024) return `${Math.max(0, bytes)} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes;
  let unit = -1;
  do {
    value /= 1024;
    unit += 1;
  } while (value >= 1024 && unit < units.length - 1);
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}

export function CacheSection() {
  const { t } = useI18n();
  const { info, loading, clearing, error, notice, refresh, clear } =
    useCacheInfo();

  return (
    <section
      aria-labelledby="cache-heading"
      className="border-t border-hairline pt-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="cache-heading" className="text-base font-semibold">
          {t("settings.cache")}
        </h2>
        <div className="flex gap-2">
          <Button disabled={loading || clearing} onClick={refresh}>
            {t("Refresh")}
          </Button>
          <Button
            disabled={loading || clearing || !info?.entries}
            onClick={clear}
          >
            {clearing ? t("settings.cacheClearing") : t("settings.cacheClear")}
          </Button>
        </div>
      </div>
      <p className="mt-2 text-sm text-mist">{t("settings.cacheHint")}</p>
      <When condition={Boolean(error)}>
        <p
          role="alert"
          className="mt-3 wrap-break-word text-sm text-accent-soft"
        >
          {t("settings.cacheError")} {error}
        </p>
      </When>
      <When condition={notice}>
        <p role="status" className="mt-3 text-sm text-mist">
          {t("settings.cacheCleared")}
        </p>
      </When>
      <When condition={Boolean(info)}>
        <dl className="mt-4 space-y-4">
          <div className="grid gap-1 sm:grid-cols-[160px_1fr]">
            <dt className="text-sm text-mist">{t("settings.cacheSize")}</dt>
            <dd className="text-sm">
              {loading ? t("settings.loading") : formatBytes(info?.bytes ?? 0)}
            </dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-[160px_1fr]">
            <dt className="text-sm text-mist">{t("settings.cacheEntries")}</dt>
            <dd className="text-sm">
              {loading
                ? t("settings.loading")
                : t("settings.cacheEntriesCount", {
                    count: info?.entries ?? 0,
                  })}
            </dd>
          </div>
          <div className="grid gap-1 sm:grid-cols-[160px_1fr]">
            <dt className="text-sm text-mist">{t("settings.cachePath")}</dt>
            <dd className="min-w-0 wrap-break-word font-mono text-xs leading-relaxed">
              {info?.path}
            </dd>
          </div>
        </dl>
      </When>
    </section>
  );
}
