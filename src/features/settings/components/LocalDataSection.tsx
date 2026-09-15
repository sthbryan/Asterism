import { When } from "react-if";
import { useI18n } from "@/app/hooks";
import { useStore } from "@/app/store";
import { Button } from "@/components/Button";
import { useLocalData } from "../hooks/useLocalData";

export function LocalDataSection() {
  const { t } = useI18n();
  const account = useStore((s) => s.account);
  const dataPath = useStore((s) => s.dataPath);
  const legacy = useStore((s) => s.legacyAvailable);
  const status = useStore((s) => s.status);
  const connecting = useStore((s) => s.connecting);
  const { busy, error, done, run } = useLocalData();

  const accountText = account
    ? t("offline.account", {
        account: account === "legacy" ? t("offline.legacyName") : account,
      })
    : null;

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
      <When condition={Boolean(account)}>
        <p className="mt-3 break-words text-sm">{accountText}</p>
      </When>
      <When condition={Boolean(legacy)}>
        <div className="mt-5 space-y-3">
          <p className="text-sm text-mist">{t("offline.legacyHint")}</p>
          <div className="flex flex-wrap gap-2">
            <Button
              disabled={busy || connecting || account === "legacy"}
              onClick={() => void run("legacy")}
            >
              {t("offline.viewLegacy")}
            </Button>
            <When condition={Boolean(status?.ok)}>
              <Button
                disabled={busy || connecting}
                onClick={() => void run("import")}
              >
                {t("offline.import", { account: account ?? "" })}
              </Button>
            </When>
          </div>
        </div>
      </When>
      <div className="mt-5">
        <Button
          disabled={busy || connecting || !account}
          onClick={() => void run("clear")}
        >
          {t("offline.clear")}
        </Button>
        <p className="mt-2 text-sm text-mist">{t("offline.clearHint")}</p>
      </div>
      <When condition={Boolean(error)}>
        <p role="alert" className="mt-3 break-words text-sm text-accent-soft">
          {t("settings.saveError")} {error}
        </p>
      </When>
      <When condition={done}>
        <p role="status" className="mt-3 text-sm text-mist">
          {t("offline.saved")}
        </p>
      </When>
    </section>
  );
}
