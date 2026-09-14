import { useI18n } from "@/app/hooks";
import { useStore } from "@/app/store";
import { Button } from "./Button";

export function ConnectionNotice() {
  const { t } = useI18n();
  const status = useStore((s) => s.status);
  const connecting = useStore((s) => s.connecting);
  const booted = useStore((s) => s.booted);
  const retry = useStore((s) => s.retryBoot);
  const account = useStore((s) => s.account);
  if (!booted || status?.ok) return null;
  const error = status?.error?.toLowerCase() ?? "";
  const reason =
    status?.kind === "storage"
      ? "storageError"
      : error.includes("not found")
        ? "missing"
        : /auth|401|login|token/.test(error)
          ? "auth"
          : "network";
  return (
    <div
      role="status"
      className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-hairline bg-night px-6 py-3 text-sm"
    >
      <div className="min-w-0">
        <p className="font-medium">
          {t(connecting ? "offline.checking" : "offline.title")}
        </p>
        <p className="mt-1 text-mist">
          {t(connecting ? "offline.localFirst" : `offline.${reason}`)}
        </p>
        {!account && <p className="mt-1 text-mist">{t("offline.empty")}</p>}
      </div>
      <Button disabled={connecting} onClick={retry}>
        {t("Check connection")}
      </Button>
    </div>
  );
}
