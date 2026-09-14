import { useState } from "react";
import { useI18n } from "@/app/hooks";
import { useStore } from "@/app/store";
import { Button } from "@/components/Button";
import {
  clearLocalCache,
  importLegacyData,
  useLegacyData as viewLegacyData,
} from "@/services/api";

export function LocalDataSection() {
  const { t } = useI18n();
  const account = useStore((s) => s.account);
  const dataPath = useStore((s) => s.dataPath);
  const legacy = useStore((s) => s.legacyAvailable);
  const status = useStore((s) => s.status);
  const connecting = useStore((s) => s.connecting);
  const hydrate = useStore((s) => s.hydrateLocal);
  const bootFail = useStore((s) => s.bootFail);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  async function run(action: "clear" | "import" | "legacy") {
    if (busy) return;
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      const result = await (action === "clear"
        ? clearLocalCache()
        : action === "import"
          ? importLegacyData()
          : viewLegacyData());
      hydrate(result);
      if (action === "legacy")
        bootFail({ ok: false, login: null, error: null, hint: null });
      setDone(true);
    } catch (err) {
      setError(String(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      aria-labelledby="local-heading"
      className="border-t border-hairline pt-5"
    >
      <h2 id="local-heading" className="text-base font-semibold">
        {t("offline.storage")}
      </h2>
      <p className="mt-2 text-sm text-mist">{t("offline.storageHint")}</p>
      <p className="mt-3 break-words font-mono text-xs">{dataPath}</p>
      <p className="mt-3 text-sm text-mist">{t("offline.retention")}</p>
      {account && (
        <p className="mt-3 break-words text-sm">
          {t("offline.account", {
            account: account === "legacy" ? t("offline.legacyName") : account,
          })}
        </p>
      )}
      {legacy && (
        <div className="mt-5 space-y-3">
          <p className="text-sm text-mist">{t("offline.legacyHint")}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy || connecting || account === "legacy"}
              onClick={() => void run("legacy")}
            >
              {t("offline.viewLegacy")}
            </Button>
            {status?.ok && (
              <Button
                disabled={busy || connecting}
                onClick={() => void run("import")}
              >
                {t("offline.import", { account: account ?? "" })}
              </Button>
            )}
          </div>
        </div>
      )}
      <div className="mt-5">
        <Button
          disabled={busy || connecting || !account}
          onClick={() => void run("clear")}
        >
          {t("offline.clear")}
        </Button>
        <p className="mt-2 text-sm text-mist">{t("offline.clearHint")}</p>
      </div>
      {error && (
        <p role="alert" className="mt-3 break-words text-sm text-accent-soft">
          {t("settings.saveError")} {error}
        </p>
      )}
      {done && (
        <p role="status" className="mt-3 text-sm text-mist">
          {t("offline.saved")}
        </p>
      )}
    </section>
  );
}
