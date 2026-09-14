import { WarningCircle } from "@phosphor-icons/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useState } from "react";
import { Button } from "../components/Button";
import type { Status } from "../lib/types";

export function ErrorScreen({
  status,
  onRetry,
}: {
  status: Status;
  onRetry: () => void;
}) {
  const [actionError, setActionError] = useState<string | null>(null);
  const missing = status.error?.includes("was not found") ?? false;
  return (
    <div className="flex h-full items-center justify-center overflow-y-auto px-6 py-8">
      <div className="max-w-md">
        <WarningCircle size={28} className="text-accent-soft" />
        <h1 className="mt-5 text-[26px] leading-tight font-semibold tracking-[-0.03em]">
          {missing ? "Set up GitHub CLI" : "Connect to GitHub"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-mist">
          {missing
            ? "Asterism needs GitHub CLI to access your repositories. Install it, then sign in from your terminal."
            : "Asterism could not connect to your GitHub account. Check your connection and GitHub CLI sign-in, then try again."}
        </p>
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
                Open GitHub CLI installation instructions
              </button>
            </li>
          )}
          <li>
            {missing ? "2." : "1."} In your terminal, run{" "}
            <code className="rounded bg-fill px-2 py-1">
              {missing ? "gh auth login" : "gh auth status"}
            </code>
          </li>
          {!missing && (
            <li>
              2. If you need to sign in, run{" "}
              <code className="rounded bg-fill px-2 py-1">gh auth login</code>
            </li>
          )}
          <li>3. Return here and check the connection.</li>
        </ol>
        <Button variant="primary" className="mt-6" onClick={onRetry}>
          Check connection
        </Button>
        {status.error && (
          <details className="mt-5 text-xs text-mist">
            <summary className="cursor-pointer">Connection details</summary>
            <p className="mt-2 whitespace-pre-wrap break-words">
              {status.error}
            </p>
          </details>
        )}
        {actionError && (
          <p role="alert" className="mt-3 text-sm text-accent-soft">
            {actionError}
          </p>
        )}
      </div>
    </div>
  );
}
