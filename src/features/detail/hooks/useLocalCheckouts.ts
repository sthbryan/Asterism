import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/app/hooks";
import { useResource } from "@/app/hooks/useResource";
import { useStore } from "@/app/store";
import { type EditorTarget, readEditor, writeEditor } from "@/lib/editor";
import {
  chooseLocalFolder,
  cloneLocalRepository,
  linkLocalCheckout,
  listLocalCheckouts,
  openLocalCheckout,
  unlinkLocalCheckout,
} from "@/services/api";
import { checkoutCache } from "@/services/api/resources";
import { localError, suggestFolderName } from "../utils/localUtils";

export type { EditorTarget };

async function fetchCheckouts() {
  return {
    data: await listLocalCheckouts(),
    fetchedAt: Math.floor(Date.now() / 1_000),
    warning: null,
  };
}

export function useLocalCheckouts(fullName: string) {
  const { t } = useI18n();
  const account = useStore((s) => s.account);
  const revision = useStore((s) => s.dataRevision);
  const resource = useResource(
    checkoutCache,
    "all",
    fetchCheckouts,
    true,
    true,
  );
  const [parent, setParent] = useState<string | null>(null);
  const [name, setName] = useState(() => suggestFolderName(fullName));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editor, setEditorState] = useState<EditorTarget>(readEditor);
  const generation = useRef(0);
  const running = useRef(false);

  useEffect(() => {
    void account;
    void revision;
    setParent(null);
    setName(suggestFolderName(fullName));
    setBusy(false);
    setError(null);
    running.current = false;
    generation.current++;
    return () => {
      generation.current++;
    };
  }, [fullName, account, revision]);

  async function run(task: (current: () => boolean) => Promise<void>) {
    if (running.current) return;
    running.current = true;
    const request = generation.current;
    const current = () =>
      request === generation.current &&
      account === useStore.getState().account &&
      revision === useStore.getState().dataRevision;
    setBusy(true);
    setError(null);
    try {
      await task(current);
    } catch (err) {
      if (current()) setError(localError(err, t));
    } finally {
      if (current()) {
        running.current = false;
        setBusy(false);
      }
    }
  }

  async function reload(current: () => boolean) {
    if (!current()) return;
    checkoutCache.clear();
    await resource.refresh();
  }

  return {
    items: (resource.saved?.data ?? []).filter(
      (row) => row.fullName === fullName,
    ),
    busy: busy || resource.loading,
    error: error ?? (resource.error ? localError(resource.error, t) : null),
    parent,
    name,
    setName,
    editor,
    setEditor: (next: EditorTarget) => {
      setEditorState(next);
      writeEditor(next);
    },
    link: () =>
      run(async (current) => {
        const path = await chooseLocalFolder();
        if (!path || !current()) return;
        await linkLocalCheckout(fullName, path);
        await reload(current);
      }),
    confirmClone: () =>
      run(async (current) => {
        if (!parent || !name.trim()) return;
        await cloneLocalRepository(fullName, parent, name.trim());
        if (current()) setParent(null);
        await reload(current);
      }),
    cancelClone: () => setParent(null),
    unlink: (path: string) =>
      run(async (current) => {
        await unlinkLocalCheckout(fullName, path);
        await reload(current);
      }),
    chooseCloneParent: () =>
      run(async (current) => {
        const path = await chooseLocalFolder();
        if (path && current()) setParent(path);
      }),
    open: (path: string, target: "folder" | EditorTarget) =>
      run(() => openLocalCheckout(fullName, path, target)),
  };
}
