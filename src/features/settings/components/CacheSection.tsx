import { DatabaseIcon } from "@phosphor-icons/react";
import { Button, Notice } from "@zovaris/sephiro";
import { When } from "react-if";
import { useI18n } from "@/app/hooks";
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
    <section aria-labelledby="cache-heading" className="app-section">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="app-chip">
            <DatabaseIcon size={15} />
          </span>
          <h2 id="cache-heading" className="kpi-label text-faint">
            {t("settings.cache")}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={loading || clearing}
            onClick={refresh}
          >
            {t("Refresh")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={loading || clearing || !info?.entries}
            onClick={clear}
          >
            {clearing ? t("settings.cacheClearing") : t("settings.cacheClear")}
          </Button>
        </div>
      </div>
      <p className="mt-2 text-sm text-mist">{t("settings.cacheHint")}</p>
      <When condition={Boolean(error)}>
        <Notice variant="danger" className="mt-3">
          {t("settings.cacheError")} {error}
        </Notice>
      </When>
      <When condition={notice}>
        <p role="status" className="mt-3 text-sm text-mist">
          {t("settings.cacheCleared")}
        </p>
      </When>
      <When condition={Boolean(info)}>
        <dl className="mt-3 divide-y divide-hairline">
          <div className="grid gap-1 py-2.5 sm:grid-cols-[160px_1fr]">
            <dt className="text-sm text-mist">{t("settings.cacheSize")}</dt>
            <dd className="text-sm">
              {loading ? t("settings.loading") : formatBytes(info?.bytes ?? 0)}
            </dd>
          </div>
          <div className="grid gap-1 py-2.5 sm:grid-cols-[160px_1fr]">
            <dt className="text-sm text-mist">{t("settings.cacheEntries")}</dt>
            <dd className="text-sm">
              {loading
                ? t("settings.loading")
                : t("settings.cacheEntriesCount", {
                    count: info?.entries ?? 0,
                  })}
            </dd>
          </div>
          <div className="grid gap-1 py-2.5 sm:grid-cols-[160px_1fr]">
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
