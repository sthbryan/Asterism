import { useRef, useState } from "react";
import { useI18n } from "@/app/hooks";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { aheadBehindText, isValidBranchName, pushTarget } from "@/lib/git";
import type { GitSyncStatus } from "@/lib/types";
import {
  gitCreateBranch,
  gitFetch,
  gitPull,
  gitPush,
  gitSwitchBranch,
  gitSyncStatus,
} from "@/services/api";

const GIT_CODES = [
  "GIT_UNAVAILABLE",
  "GIT_NOT_GIT",
  "GIT_FAILED",
  "GIT_REMOTE_FAILED",
  "GIT_AUTH_FAILED",
  "GIT_DIRTY",
  "GIT_DIVERGED",
  "GIT_NO_UPSTREAM",
  "GIT_PUSH_REJECTED",
  "GIT_DETACHED",
  "GIT_BRANCH_EXISTS",
  "GIT_BRANCH_NOT_FOUND",
  "GIT_INVALID_BRANCH",
  "GIT_SWITCH_FAILED",
  "GIT_CREATE_FAILED",
];

const DETAIL_CODES = new Set([
  "GIT_REMOTE_FAILED",
  "GIT_AUTH_FAILED",
  "GIT_FAILED",
  "GIT_SWITCH_FAILED",
  "GIT_CREATE_FAILED",
]);

function gitErrorCode(error: unknown): string | null {
  const text = String(error);
  return GIT_CODES.find((code) => text.includes(code)) ?? null;
}

export function GitSyncPanel({
  fullName,
  path,
}: {
  fullName: string;
  path: string;
}) {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<GitSyncStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [switchTo, setSwitchTo] = useState("");
  const [newBranch, setNewBranch] = useState("");
  const [switchNew, setSwitchNew] = useState(true);
  const generation = useRef(0);

  async function load() {
    const request = ++generation.current;
    setBusy(true);
    setError(null);
    try {
      const next = await gitSyncStatus(fullName, path);
      if (request === generation.current) {
        setStatus(next);
        setSwitchTo(next.branch ?? "");
      }
    } catch (e) {
      if (request === generation.current) setError(String(e));
    } finally {
      if (request === generation.current) setBusy(false);
    }
  }

  async function run(op: () => Promise<GitSyncStatus>) {
    const request = generation.current;
    setBusy(true);
    setError(null);
    try {
      const next = await op();
      if (request === generation.current) {
        setStatus(next);
        setSwitchTo(next.branch ?? "");
      }
    } catch (e) {
      if (request === generation.current) setError(String(e));
    } finally {
      if (request === generation.current) setBusy(false);
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !status) void load();
  }

  const code = error ? gitErrorCode(error) : null;
  const detail =
    error && code && DETAIL_CODES.has(code)
      ? String(error)
          .replace(code, "")
          .replace(/^[:\s]+/, "")
      : "";
  const push = status ? pushTarget(status) : null;
  const badge = status ? aheadBehindText(status.ahead, status.behind) : null;

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
      </Button>
      {open ? (
        <div className="mt-2 space-y-2">
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
                <Button
                  disabled={busy}
                  onClick={() => void run(() => gitFetch(fullName, path))}
                >
                  {t("local.git.fetch")}
                </Button>
                <Button
                  disabled={busy || status.detached || !status.upstream}
                  onClick={() => void run(() => gitPull(fullName, path))}
                >
                  {t("local.git.pull")}
                </Button>
                <Button
                  disabled={busy || status.detached || !push}
                  onClick={() =>
                    void run(() =>
                      gitPush(fullName, path, push?.setsUpstream ?? false),
                    )
                  }
                >
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
                  onClick={() =>
                    void run(() => gitSwitchBranch(fullName, path, switchTo))
                  }
                >
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
                    onClick={() => {
                      const name = newBranch.trim();
                      setNewBranch("");
                      void run(() =>
                        gitCreateBranch(fullName, path, name, switchNew),
                      );
                    }}
                  >
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
      ) : null}
    </div>
  );
}
