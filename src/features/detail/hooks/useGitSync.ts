import { useRef, useState } from "react";
import { useI18n } from "@/app/hooks";
import { aheadBehindText, pushTarget } from "@/lib/git";
import type { GitSyncStatus } from "@/lib/types";
import {
  gitCreateBranch,
  gitFetch,
  gitPull,
  gitPush,
  gitSwitchBranch,
  gitSyncStatus,
} from "@/services/api";
import { gitErrorCode, gitErrorDetail } from "../utils/gitErrors";

/**
 * All GitSyncPanel state and guarded git operations for one checkout path.
 * Generation-guarded so a stale response can never overwrite a newer view.
 */
export function useGitSync(fullName: string, path: string) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<GitSyncStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [progressKey, setProgressKey] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
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

  async function run(
    id: string,
    progress: string,
    done: (next: GitSyncStatus) => string,
    op: () => Promise<GitSyncStatus>,
  ) {
    const request = generation.current;
    setBusy(true);
    setActive(id);
    setProgressKey(progress);
    setNotice(null);
    setError(null);
    try {
      const next = await op();
      if (request === generation.current) {
        setStatus(next);
        setSwitchTo(next.branch ?? "");
        setNotice(done(next));
      }
    } catch (e) {
      if (request === generation.current) setError(String(e));
    } finally {
      if (request === generation.current) {
        setBusy(false);
        setActive(null);
        setProgressKey(null);
      }
    }
  }

  function toggle() {
    const next = !open;
    setOpen(next);
    if (next && !status) void load();
  }

  const code = error ? gitErrorCode(error) : null;
  const detail = error ? gitErrorDetail(error) : "";
  const push = status ? pushTarget(status) : null;
  const badge = status ? aheadBehindText(status.ahead, status.behind) : null;

  return {
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
    doFetch: () =>
      run(
        "fetch",
        "local.git.fetching",
        () => t("local.git.fetched"),
        () => gitFetch(fullName, path),
      ),
    doPull: () =>
      run(
        "pull",
        "local.git.pulling",
        () => t("local.git.pulled"),
        () => gitPull(fullName, path),
      ),
    doPush: () =>
      push
        ? run(
            "push",
            "local.git.pushing",
            (next) =>
              t("local.git.pushed", {
                target: next.upstream ?? push.label ?? "",
              }),
            () => gitPush(fullName, path, push.setsUpstream ?? false),
          )
        : Promise.resolve(),
    doSwitch: () =>
      run(
        "switch",
        "local.git.switching",
        (next) => t("local.git.switched", { branch: next.branch ?? switchTo }),
        () => gitSwitchBranch(fullName, path, switchTo),
      ),
    doCreate: () => {
      const name = newBranch.trim();
      setNewBranch("");
      return run(
        "create",
        "local.git.creating",
        () => t("local.git.created", { branch: name }),
        () => gitCreateBranch(fullName, path, name, switchNew),
      );
    },
  };
}
