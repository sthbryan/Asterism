import { WarningCircle } from "@phosphor-icons/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useState } from "react";
import { useI18n } from "@/app/hooks";
import { Button } from "@/components/Button";
import type { Status } from "@/lib/types";

export function ErrorScreen({
  status,
  onRetry,
}: {
  status: Status;
  onRetry: () => void;
}) {
  const { t } = useI18n();
  const [actionError, setActionError] = useState<string | null>(null);
  const storage = status.kind === "storage";
  const missing = status.error?.includes("was not found") ?? false;
  return (
    <div className="flex h-full items-center justify-center overflow-y-auto px-6 py-8">
      <div className="max-w-md">
        <WarningCircle size={28} className="text-accent-soft" />
        <h1 className="mt-5 text-[26px] leading-tight font-semibold tracking-[-0.03em]">
          {storage
            ? t("offline.storage")
            : missing
              ? t("Set up GitHub CLI")
              : t("Connect to GitHub")}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-mist">
          {storage
            ? t("offline.storageError")
            : missing
              ? t(
                  "Asterism needs GitHub CLI to access your repositories. Install it, then sign in from your terminal.",
                )
              : t(
                  "Asterism could not connect to your GitHub account. Check your connection and GitHub CLI sign-in, then try again.",
                )}
        </p>
        {!storage && (
          <ol className="mt-6 space-y-4 text-sm">
            {missing && (
              <li>
                1.{" "}
                <button
                  type="button"
                  className="text-paper underline underline-offset-4"
                  onClick={() => {
                    void openUrl("https://cli.github.com").catch((err) =>
                      setActionError(String(err)),
                    );
                  }}
                >
                  {t("Open GitHub CLI installation instructions")}
                </button>
              </li>
            )}
            <li>
              {missing ? "2." : "1."} {t("In your terminal, run")}{" "}
              <code className="rounded bg-fill px-2 py-1">
                {missing ? "gh auth login" : "gh auth status"}
              </code>
            </li>
            {!missing && (
              <li>
                {t("2. If you need to sign in, run")}{" "}
                <code className="rounded bg-fill px-2 py-1">gh auth login</code>
              </li>
            )}
            <li>{t("3. Return here and check the connection.")}</li>
          </ol>
        )}
        <Button variant="primary" className="mt-6" onClick={onRetry}>
          {t("Check connection")}
        </Button>
        {status.error && (
          <details className="mt-5 text-xs text-mist">
            <summary className="cursor-pointer">
              {t("Connection details")}
            </summary>
            <p className="mt-2 whitespace-pre-wrap break-words">
              {status.error}
            </p>
          </details>
        )}
        {actionError && (
          <p role="alert" className="mt-3 text-sm text-accent-soft">
            {t("errors.request")} {actionError}
          </p>
        )}
      </div>
    </div>
  );
}
