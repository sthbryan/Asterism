import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/app/hooks";
import { useStore } from "@/app/store";
import type { LocalCheckout } from "@/lib/types";
import {
  chooseLocalFolder,
  cloneLocalRepository,
  linkLocalCheckout,
  listLocalCheckouts,
  openLocalCheckout,
  unlinkLocalCheckout,
} from "@/services/api";
import { localError, suggestFolderName } from "../utils/localUtils";

export type EditorTarget = "vscode" | "cursor" | "zed";

function readEditor(): EditorTarget {
  try {
    const value = localStorage.getItem("asterism.editor");
    return value === "cursor" || value === "zed" ? value : "vscode";
  } catch {
    return "vscode";
  }
}

/**
 * Checkout list state and guarded actions for one repository.
 * Every action shares the same busy/error/generation handling so a stale
 * response can never overwrite a newer view.
 */
export function useLocalCheckouts(fullName: string) {
  const { t } = useI18n();
  const account = useStore((s) => s.account);
  const online = useStore((s) => s.status?.ok === true);
  const [items, setItems] = useState<LocalCheckout[]>([]);
  const [parent, setParent] = useState<string | null>(null);
  const [name, setName] = useState(() => suggestFolderName(fullName));
  const [busy, setBusy] = useState(false);
  const [editor, setEditorState] = useState<EditorTarget>(readEditor);
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);

  useEffect(() => {
    // The body does not read `account`, but the list must reload after an
    // account switch, so it stays a dependency on purpose.
    void account;
    const request = ++generation.current;
    let active = true;
    setItems([]);
    setError(null);
    setParent(null);
    setBusy(false);
    setName(suggestFolderName(fullName));
    void listLocalCheckouts()
      .then((rows) => {
        if (active && request === generation.current)
          setItems(rows.filter((row) => row.fullName === fullName));
      })
      .catch((e) => {
        if (active && request === generation.current)
          setError(localError(e, t));
      });
    return () => {
      active = false;
      generation.current++;
    };
  }, [fullName, account, t]);

  async function run(task: (request: number) => Promise<void>) {
    const request = generation.current;
    setBusy(true);
    setError(null);
    try {
      await task(request);
    } catch (e) {
      if (request === generation.current) setError(localError(e, t));
    } finally {
      if (request === generation.current) setBusy(false);
    }
  }

  function upsert(item: LocalCheckout, request: number) {
    if (request !== generation.current) return;
    setItems((old) => [
      ...old.filter((entry) => entry.path !== item.path),
      item,
    ]);
  }

  async function link() {
    await run(async (request) => {
      const path = await chooseLocalFolder();
      if (!path || request !== generation.current) return;
      upsert(await linkLocalCheckout(fullName, path), request);
    });
  }

  async function confirmClone() {
    if (!parent || !name.trim()) return;
    const folder = name.trim();
    await run(async (request) => {
      const item = await cloneLocalRepository(fullName, parent, folder);
      if (request !== generation.current) return;
      upsert(item, request);
      setParent(null);
    });
  }

  async function unlink(path: string) {
    if (busy) return;
    await run(async (request) => {
      await unlinkLocalCheckout(fullName, path);
      if (request !== generation.current) return;
      const rows = await listLocalCheckouts();
      if (request === generation.current)
        setItems(rows.filter((row) => row.fullName === fullName));
    });
  }

  async function chooseCloneParent() {
    await run(async (request) => {
      const path = await chooseLocalFolder();
      if (path && request === generation.current) setParent(path);
    });
  }

  async function open(path: string, target: "folder" | EditorTarget) {
    await run(() => openLocalCheckout(fullName, path, target));
  }

  function setEditor(next: EditorTarget) {
    setEditorState(next);
    try {
      localStorage.setItem("asterism.editor", next);
    } catch {
      /* best effort */
    }
  }

  function cancelClone() {
    setParent(null);
  }

  return {
    items,
    busy,
    error,
    online,
    parent,
    name,
    setName,
    editor,
    setEditor,
    link,
    confirmClone,
    cancelClone,
    unlink,
    chooseCloneParent,
    open,
  };
}
