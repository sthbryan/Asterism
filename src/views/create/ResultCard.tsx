import { ArrowSquareOut, CheckCircle } from "@phosphor-icons/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { isMockMode } from "../../lib/api";
import type { CreatedRepo } from "../../lib/types";
import { Button } from "../../components/Button";

export function ResultCard({
  created,
  error,
  busy,
  setError,
  onOverview,
  onReset,
}: {
  created: CreatedRepo;
  error: string | null;
  busy: boolean;
  setError: (msg: string) => void;
  onOverview: () => void;
  onReset: () => void;
}) {
  return (
    <div className="py-8" role="status">
      <CheckCircle size={30} className="text-ok" />
      <h2 className="mt-4 text-xl font-semibold">Repository created</h2>
      <p className="mt-2 break-all font-mono text-sm">{created.fullName}</p>
      <p className="mt-2 text-sm text-mist">
        {created.private ? "Private" : "Public"} repository{isMockMode() ? " · Demo only" : " on GitHub"}.
      </p>
      {error && (
        <p role="alert" className="mt-4 text-sm text-accent-soft">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="primary" onClick={onOverview}>
          View overview
        </Button>
        {!isMockMode() && (
          <Button
            onClick={() => {
              void openUrl(created.htmlUrl).catch((err) => setError(String(err)));
            }}
          >
            Open on GitHub <ArrowSquareOut size={14} />
          </Button>
        )}
        <Button disabled={busy} onClick={onReset}>
          Create another
        </Button>
      </div>
    </div>
  );
}
