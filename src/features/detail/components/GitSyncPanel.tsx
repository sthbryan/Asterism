import {
  ArrowDownIcon,
  ArrowsClockwiseIcon,
  ArrowUpIcon,
  CaretDownIcon,
  CheckCircleIcon,
  CircleNotchIcon,
} from "@phosphor-icons/react";
import { cn } from "cn";
import type { ReactNode } from "react";
import { Else, If, Then, When } from "react-if";
import { useI18n } from "@/app/hooks";
import { Button } from "@/components/Button";
import { useGitSync } from "../hooks/useGitSync";
import { GitBranchControls } from "./GitBranchControls";
import { GitSyncSummary } from "./GitSyncSummary";

export function GitSyncPanel({
  fullName,
  path,
}: {
  fullName: string;
  path: string;
}) {
  const { t } = useI18n();
  const sync = useGitSync(fullName, path);
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
    toggle,
    doFetch,
    doPull,
    doPush,
  } = sync;

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
            <When condition={busy && !status}>
              <p className="text-[12px] text-faint">{t("local.git.loading")}</p>
            </When>
            <When condition={Boolean(status)}>
              {status && <GitSyncSummary status={status} badge={badge} />}
              <div className="flex flex-wrap gap-1">
                <Button disabled={busy} onClick={() => void doFetch()}>
                  {actionIcon(
                    "fetch",
                    <ArrowsClockwiseIcon size={14} aria-hidden />,
                  )}
                  {t("local.git.fetch")}
                </Button>
                <Button
                  disabled={busy || status?.detached || !status?.upstream}
                  onClick={() => void doPull()}
                >
                  {actionIcon("pull", <ArrowDownIcon size={14} aria-hidden />)}
                  {t("local.git.pull")}
                </Button>
                <Button
                  disabled={busy || status?.detached || !push}
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
              <If condition={Boolean(active && progressKey)}>
                <Then>
                  <p
                    role="status"
                    className="flex items-center gap-1.5 text-[12px] text-mist"
                  >
                    <CircleNotchIcon
                      size={14}
                      aria-hidden
                      className="animate-spin"
                    />
                    {progressKey && t(progressKey)}
                  </p>
                </Then>
                <Else>
                  <When condition={Boolean(notice)}>
                    <p
                      role="status"
                      className="flex items-center gap-1.5 text-[12px] text-mist"
                    >
                      <CheckCircleIcon size={14} aria-hidden />
                      {notice}
                    </p>
                  </When>
                </Else>
              </If>
              <GitBranchControls sync={sync} path={path} />
            </When>
            <When condition={Boolean(error)}>
              <div role="alert" className="text-[12.5px] text-accent-soft">
                <p>{code ? t(`local.errors.${code}`) : String(error)}</p>
                <When condition={Boolean(detail)}>
                  <details className="mt-1">
                    <summary className="cursor-pointer text-[12px]">
                      Details
                    </summary>
                    <p className="mt-1 break-words text-[12px]">{detail}</p>
                  </details>
                </When>
              </div>
            </When>
          </div>
        </div>
      </div>
    </div>
  );
}
