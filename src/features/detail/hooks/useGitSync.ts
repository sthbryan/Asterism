import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/app/hooks";
import { useResource } from "@/app/hooks/useResource";
import { useStore } from "@/app/store";
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
import { checkoutCache, gitStatusCache } from "@/services/api/resources";
import { gitErrorCode, gitErrorDetail } from "../utils/gitErrors";

/**
 * All GitSyncPanel state and guarded git operations for one checkout path.
 * Generation-guarded so a stale response can never overwrite a newer view.
 */
export function useGitSync(fullName: string, path: string) {
  const { t } = useI18n();
  // The panel shows its actions inline, so the status loads with the checkout.
  const open = true;
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
  const running = useRef(false);
  const account = useStore((state) => state.account);
  const revision = useStore((state) => state.dataRevision);
  const fetch = useCallback(
    async () => ({
      data: await gitSyncStatus(fullName, path),
      fetchedAt: Math.floor(Date.now() / 1_000),
      warning: null,
    }),
    [fullName, path],
  );
  const resource = useResource(
    gitStatusCache,
    JSON.stringify([fullName, path]),
    fetch,
    open,
    true,
  );

  useEffect(() => {
    void fullName;
    void path;
    void account;
    void revision;
    generation.current++;
    running.current = false;
    setStatus(null);
    setError(null);
    setNotice(null);
    setActive(null);
    setBusy(false);
    return () => {
      generation.current++;
    };
  }, [fullName, path, account, revision]);

  useEffect(() => {
    if (resource.saved) {
      setStatus(resource.saved.data);
      setSwitchTo(resource.saved.data.branch ?? "");
    }
  }, [resource.saved]);

  async function run(
    id: string,
    progress: string,
    done: (next: GitSyncStatus) => string,
    op: () => Promise<GitSyncStatus>,
  ) {
    if (running.current) return;
    running.current = true;
    const request = generation.current;
    const current = () =>
      request === generation.current &&
      account === useStore.getState().account &&
      revision === useStore.getState().dataRevision;
    setBusy(true);
    setActive(id);
    setProgressKey(progress);
    setNotice(null);
    setError(null);
    try {
      const next = await op();
      if (current()) {
        setStatus(next);
        setSwitchTo(next.branch ?? "");
        setNotice(done(next));
        gitStatusCache.clear();
        checkoutCache.clear();
        await resource.refresh();
      }
    } catch (e) {
      if (current()) setError(String(e));
    } finally {
      if (current()) {
        running.current = false;
        setBusy(false);
        setActive(null);
        setProgressKey(null);
      }
    }
  }

  const failure = error ?? resource.error;
  const code = failure ? gitErrorCode(failure) : null;
  const detail = failure ? gitErrorDetail(failure) : "";
  const push = status ? pushTarget(status) : null;
  const badge = status ? aheadBehindText(status.ahead, status.behind) : null;

  return {
    status,
    busy: busy || resource.loading,
    active,
    progressKey,
    notice,
    error: failure,
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
