import {
  ArrowDownIcon,
  ArrowsClockwiseIcon,
  ArrowUpIcon,
  CaretDownIcon,
  CheckCircleIcon,
} from "@phosphor-icons/react";
import { Button, Collapsible, Spinner } from "@zovaris/sephiro";
import { cn } from "cn";
import { useI18n } from "@/app/hooks";
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
  return (
    <div className="mt-2 border-t border-hairline pt-2">
      <Button
        variant="secondary"
        size="sm"
        className="shrink-0"
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
            {busy && !status && (
              <p className="text-[12px] text-faint">{t("local.git.loading")}</p>
            )}
            {status && (
              <>
                <GitSyncSummary status={status} badge={badge} />
                <div className="flex flex-wrap gap-1">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    disabled={busy}
                    onClick={() => void doFetch()}
                  >
                    {active === "fetch" ? (
                      <Spinner size="sm" />
                    ) : (
                      <ArrowsClockwiseIcon size={14} aria-hidden />
                    )}
                    {t("local.git.fetch")}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    disabled={busy || status.detached || !status.upstream}
                    onClick={() => void doPull()}
                  >
                    {active === "pull" ? (
                      <Spinner size="sm" />
                    ) : (
                      <ArrowDownIcon size={14} aria-hidden />
                    )}
                    {t("local.git.pull")}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="shrink-0"
                    disabled={busy || status.detached || !push}
                    onClick={() => void doPush()}
                  >
                    {active === "push" ? (
                      <Spinner size="sm" />
                    ) : (
                      <ArrowUpIcon size={14} aria-hidden />
                    )}
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
                    <Spinner size="sm" />
                    {t(progressKey)}
                  </p>
                ) : (
                  notice && (
                    <p
                      role="status"
                      className="flex items-center gap-1.5 text-[12px] text-mist"
                    >
                      <CheckCircleIcon size={14} aria-hidden />
                      {notice}
                    </p>
                  )
                )}
                <GitBranchControls sync={sync} path={path} />
              </>
            )}
            {error && (
              <div role="alert" className="text-[12.5px] text-accent-soft">
                <p>{code ? t(`local.errors.${code}`) : String(error)}</p>
                {detail && (
                  <Collapsible
                    className="mt-1 [&_.sph-collapsible__trigger]:text-[12px] [&_.sph-collapsible__inner]:p-0"
                    trigger="Details"
                  >
                    <p className="mt-1 break-words text-[12px]">{detail}</p>
                  </Collapsible>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
