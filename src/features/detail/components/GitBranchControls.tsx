import {
  CircleNotchIcon,
  GitBranchIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useI18n } from "@/app/hooks";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { isValidBranchName } from "@/lib/git";
import type { useGitSync } from "../hooks/useGitSync";

export function GitBranchControls({
  sync,
  path,
}: {
  sync: ReturnType<typeof useGitSync>;
  path: string;
}) {
  const { t } = useI18n();
  const {
    status,
    busy,
    active,
    switchTo,
    setSwitchTo,
    newBranch,
    setNewBranch,
    switchNew,
    setSwitchNew,
    doSwitch,
    doCreate,
  } = sync;
  function actionIcon(id: string, icon: ReactNode) {
    return active === id ? (
      <CircleNotchIcon size={14} aria-hidden className="animate-spin" />
    ) : (
      icon
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-1">
        <Select
          value={switchTo}
          onChange={(value) => setSwitchTo(value)}
          options={(status?.localBranches ?? []).map((branch) => ({
            value: branch,
            label: branch,
          }))}
          className="min-w-28 flex-1"
          ariaLabel={t("local.git.switchToBranch")}
        />
        <Button
          disabled={
            busy || !switchTo || switchTo === status?.branch || !status?.clean
          }
          size="md"
          onClick={() => void doSwitch()}
        >
          {actionIcon("switch", <GitBranchIcon size={14} aria-hidden />)}
          {t("local.git.switch")}
        </Button>
      </div>
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-1">
          <Input
            value={newBranch}
            onChange={(e) => setNewBranch(e.target.value)}
            aria-label={t("local.git.newBranch")}
            placeholder={t("local.git.newBranch")}
            className="min-w-28 flex-1"
          />
          <Button
            disabled={busy || !isValidBranchName(newBranch) || !status?.clean}
            size="md"
            className="mt-2"
            onClick={() => void doCreate()}
          >
            {actionIcon("create", <PlusIcon size={14} aria-hidden />)}
            {t("local.git.create")}
          </Button>
        </div>
        <label
          htmlFor={`git-switch-new-${path}`}
          className="flex items-center gap-2 text-[12px] text-mist"
        >
          <input
            id={`git-switch-new-${path}`}
            type="checkbox"
            checked={switchNew}
            onChange={(e) => setSwitchNew(e.target.checked)}
          />
          {t("local.git.switchToNew")}
        </label>
      </div>
    </>
  );
}
