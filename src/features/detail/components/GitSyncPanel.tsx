import {
  ArrowDownIcon,
  ArrowsClockwiseIcon,
  ArrowUpIcon,
  CaretDownIcon,
  CheckCircleIcon,
  CircleNotchIcon,
  GitBranchIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { cn } from "cn";
import type { ReactNode } from "react";
import { useI18n } from "@/app/hooks";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { isValidBranchName } from "@/lib/git";
import { useGitSync } from "../hooks/useGitSync";

export function GitSyncPanel({
  fullName,
  path,
}: {
  fullName: string;
  path: string;
}) {
  const { t, locale } = useI18n();
  const {
    open,
    status,
    busy,
    active,
    progressKey,
    notice,
    error,
    code,
    detail,
    push,
    badge,
    switchTo,
    setSwitchTo,
    newBranch,
    setNewBranch,
    switchNew,
    setSwitchNew,
    toggle,
    doFetch,
    doPull,
    doPush,
    doSwitch,
    doCreate,
  } = useGitSync(fullName, path);

  function actionIcon(id: string, icon: ReactNode) {
    return active === id ? (
      <CircleNotchIcon size={14} aria-hidden className="animate-spin" />
    ) : (
      icon
    );
  }

  return (
    <div className="mt-2 border-t border-hairline pt-2">
      <Button
        disabled={busy && !open}
        onClick={toggle}
        aria-expanded={open}
        aria-label={t("local.git.sync")}
      >
        {t("local.git.sync")}
        {badge ? ` · ${badge}` : ""}
        <CaretDownIcon
          size={14}
          aria-hidden
          className={cn(
            "transition-transform duration-200 ease-out",
            open && "rotate-180",
          )}
        />
      </Button>
      <div
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-out",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="space-y-2 pt-2">
            {busy && !status ? (
              <p className="text-[12px] text-faint">{t("local.git.loading")}</p>
            ) : null}
            {status ? (
              <>
                <dl className="space-y-1 text-[12px]">
                  <div className="flex gap-2">
                    <dt className="text-faint">{t("local.git.branch")}</dt>
                    <dd className="font-medium">
                      {status.detached
                        ? `${t("local.git.detached")}${status.head ? ` · ${status.head}` : ""}`
                        : (status.branch ?? "—")}
                      {badge ? ` · ${badge}` : ""}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-faint">{t("local.git.upstream")}</dt>
                    <dd>{status.upstream ?? "—"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="text-faint">{t("local.git.changes")}</dt>
                    <dd>
                      {status.clean
                        ? t("local.git.clean")
                        : `${status.staged} ${t("local.git.staged")} · ${status.unstaged} ${t("local.git.unstaged")} · ${status.untracked} ${t("local.git.untracked")}`}
                    </dd>
                  </div>
                </dl>
                <p className="text-[12px] text-faint">
                  {status.lastFetch
                    ? t("local.git.lastFetch", {
                        date: new Intl.DateTimeFormat(locale, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(status.lastFetch * 1000),
                      })
                    : t("local.git.neverFetched")}
                </p>
                <div className="flex flex-wrap gap-1">
                  <Button disabled={busy} onClick={() => void doFetch()}>
                    {actionIcon(
                      "fetch",
                      <ArrowsClockwiseIcon size={14} aria-hidden />,
                    )}
                    {t("local.git.fetch")}
                  </Button>
                  <Button
                    disabled={busy || status.detached || !status.upstream}
                    onClick={() => void doPull()}
                  >
                    {actionIcon(
                      "pull",
                      <ArrowDownIcon size={14} aria-hidden />,
                    )}
                    {t("local.git.pull")}
                  </Button>
                  <Button
                    disabled={busy || status.detached || !push}
                    onClick={() => void doPush()}
                  >
                    {actionIcon("push", <ArrowUpIcon size={14} aria-hidden />)}
                    {push
                      ? t(
                          push.setsUpstream
                            ? "local.git.pushSetUpstream"
                            : "local.git.pushTo",
                          { target: push.label },
                        )
                      : ""}
                  </Button>
                </div>
                {active && progressKey ? (
                  <p
                    role="status"
                    className="flex items-center gap-1.5 text-[12px] text-mist"
                  >
                    <CircleNotchIcon
                      size={14}
                      aria-hidden
                      className="animate-spin"
                    />
                    {t(progressKey)}
                  </p>
                ) : notice ? (
                  <p
                    role="status"
                    className="flex items-center gap-1.5 text-[12px] text-mist"
                  >
                    <CheckCircleIcon size={14} aria-hidden />
                    {notice}
                  </p>
                ) : null}
                <div className="flex flex-wrap items-center gap-1">
                  <Select
                    value={switchTo}
                    onChange={(value) => setSwitchTo(value)}
                    options={status.localBranches.map((branch) => ({
                      value: branch,
                      label: branch,
                    }))}
                    className="min-w-28 flex-1"
                    ariaLabel={t("local.git.switchToBranch")}
                  />
                  <Button
                    disabled={
                      busy ||
                      !switchTo ||
                      switchTo === status.branch ||
                      !status.clean
                    }
                    size="md"
                    onClick={() => void doSwitch()}
                  >
                    {actionIcon(
                      "switch",
                      <GitBranchIcon size={14} aria-hidden />,
                    )}
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
                      disabled={
                        busy || !isValidBranchName(newBranch) || !status.clean
                      }
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
            ) : null}
            {error ? (
              <div role="alert" className="text-[12.5px] text-accent-soft">
                <p>{code ? t(`local.errors.${code}`) : String(error)}</p>
                {detail ? (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-[12px]">
                      Details
                    </summary>
                    <p className="mt-1 break-words text-[12px]">{detail}</p>
                  </details>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
