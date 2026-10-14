import { GitBranchIcon, PlusIcon } from "@phosphor-icons/react";
import { Button, Checkbox, Input, Select, Spinner } from "@zovaris/sephiro";
import { useI18n } from "@/app/hooks";
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
  return (
    <>
      <div className="flex flex-wrap items-center gap-1">
        <Select
          value={switchTo}
          onValueChange={setSwitchTo}
          options={(status?.localBranches ?? []).map((branch) => ({
            value: branch,
            label: branch,
          }))}
          className="min-w-28 flex-1"
          ariaLabel={t("local.git.switchToBranch")}
        />
        <Button
          variant="secondary"
          className="shrink-0"
          disabled={
            busy || !switchTo || switchTo === status?.branch || !status?.clean
          }
          size="md"
          onClick={() => void doSwitch()}
        >
          {active === "switch" ? (
            <Spinner size="sm" />
          ) : (
            <GitBranchIcon size={14} aria-hidden />
          )}
          {t("local.git.switch")}
        </Button>
      </div>
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-1">
          <Input
            size="md"
            className="mt-2 min-w-28 flex-1"
            value={newBranch}
            onChange={(e) => setNewBranch(e.target.value)}
            aria-label={t("local.git.newBranch")}
            placeholder={t("local.git.newBranch")}
          />
          <Button
            disabled={busy || !isValidBranchName(newBranch) || !status?.clean}
            size="md"
            className="mt-2"
            onClick={() => void doCreate()}
          >
            {active === "create" ? (
              <Spinner size="sm" />
            ) : (
              <PlusIcon size={14} aria-hidden />
            )}
            {t("local.git.create")}
          </Button>
        </div>
        <Checkbox
          id={`git-switch-new-${path}`}
          size="sm"
          checked={switchNew}
          onChange={(e) => setSwitchNew(e.target.checked)}
          label={t("local.git.switchToNew")}
        />
      </div>
    </>
  );
}
