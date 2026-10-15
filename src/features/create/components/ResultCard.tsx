import { ArrowSquareOutIcon, CheckCircleIcon } from "@phosphor-icons/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Button, Notice } from "@zovaris/sephiro";
import { When } from "react-if";
import { useI18n } from "@/app/hooks";
import type { CreatedRepo } from "@/lib/types";
import { isMockMode } from "@/services/api";

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
      <CheckCircleIcon size={30} className="text-ok" />
      <h2 className="mt-4 text-xl font-semibold">{t("Repository created")}</h2>
      <p className="mt-2 break-all font-mono text-sm">{created.fullName}</p>
      <p className="mt-2 text-sm text-mist">
        {t("create.result", {
          visibility: t(created.private ? "Private" : "Public").toLowerCase(),
          demo: t(isMockMode() ? "create.demoSuffix" : "create.githubSuffix"),
        })}
      </p>
      <When condition={Boolean(error)}>
        <Notice variant="danger" className="mt-4">
          {error}
        </Notice>
      </When>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button variant="primary" size="sm" onClick={onOverview}>
          {t("View overview")}
        </Button>
        <When condition={!isMockMode()}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              void openUrl(created.htmlUrl).catch((err) =>
                setError(String(err)),
              );
            }}
          >
            {t("Open on GitHub")}
            <ArrowSquareOutIcon size={14} />
          </Button>
        </When>
        <Button variant="secondary" size="sm" disabled={busy} onClick={onReset}>
          {t("Create another")}
        </Button>
      </div>
    </div>
  );
}
