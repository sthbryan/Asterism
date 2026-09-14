import { ArrowSquareOut, CheckCircle } from "@phosphor-icons/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useI18n } from "../../app/hooks";
import { Button } from "../../components/Button";
import { isMockMode } from "../../lib/api";
import type { CreatedRepo } from "../../lib/types";

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
  const { t } = useI18n();
  return (
    <div className="py-8" role="status">
      <CheckCircle size={30} className="text-ok" />
      <h2 className="mt-4 text-xl font-semibold">{t("Repository created")}</h2>
      <p className="mt-2 break-all font-mono text-sm">{created.fullName}</p>
      <p className="mt-2 text-sm text-mist">
        {t("create.result", {
          visibility: t(created.private ? "Private" : "Public").toLowerCase(),
          demo: t(isMockMode() ? "create.demoSuffix" : "create.githubSuffix"),
        })}
      </p>
      {error && (
        <p role="alert" className="mt-4 text-sm text-accent-soft">
          {error}
        </p>
      )}
      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="primary" onClick={onOverview}>
          {t("View overview")}
        </Button>
        {!isMockMode() && (
          <Button
            onClick={() => {
              void openUrl(created.htmlUrl).catch((err) =>
                setError(String(err)),
              );
            }}
          >
            {t("Open on GitHub")}
            <ArrowSquareOut size={14} />
          </Button>
        )}
        <Button disabled={busy} onClick={onReset}>
          {t("Create another")}
        </Button>
      </div>
    </div>
  );
}
