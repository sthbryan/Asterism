import { useEffect, useReducer, useRef, useState } from "react";
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

type CheckoutsState = {
  items: LocalCheckout[];
  parent: string | null;
  name: string;
  busy: boolean;
  error: string | null;
};

type CheckoutsAction =
  | { type: "reset"; name: string }
  | { type: "runStart" }
  | { type: "runEnd" }
  | { type: "runFailure"; error: string }
  | { type: "listSuccess"; items: LocalCheckout[] }
  | { type: "upsert"; item: LocalCheckout }
  | { type: "setParent"; parent: string | null }
  | { type: "setName"; name: string };

function initCheckouts(fullName: string): CheckoutsState {
  return {
    items: [],
    parent: null,
    name: suggestFolderName(fullName),
    busy: false,
    error: null,
  };
}

function checkoutsReducer(
  state: CheckoutsState,
  action: CheckoutsAction,
): CheckoutsState {
  switch (action.type) {
    case "reset":
      return {
        items: [],
        parent: null,
        name: action.name,
        busy: false,
        error: null,
      };
    case "runStart":
      return { ...state, busy: true, error: null };
    case "runEnd":
      return { ...state, busy: false };
    case "runFailure":
      return { ...state, error: action.error };
    case "listSuccess":
      return { ...state, items: action.items };
    case "upsert":
      return {
        ...state,
        items: [
          ...state.items.filter((entry) => entry.path !== action.item.path),
          action.item,
        ],
      };
    case "setParent":
      return { ...state, parent: action.parent };
    case "setName":
      return { ...state, name: action.name };
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
  const [state, dispatch] = useReducer(
    checkoutsReducer,
    fullName,
    initCheckouts,
  );

  const [editor, setEditorState] = useState<EditorTarget>(readEditor);
  const generation = useRef(0);

  const { items, parent, name, busy, error } = state;

  useEffect(() => {
    void account;
    const request = ++generation.current;
    let active = true;
    dispatch({ type: "reset", name: suggestFolderName(fullName) });
    void listLocalCheckouts()
      .then((rows) => {
        if (active && request === generation.current)
          dispatch({
            type: "listSuccess",
            items: rows.filter((row) => row.fullName === fullName),
          });
      })
      .catch((e) => {
        if (active && request === generation.current)
          dispatch({ type: "runFailure", error: localError(e, t) });
      });
    return () => {
      active = false;
      generation.current++;
    };
  }, [fullName, account, t]);

  async function run(task: (request: number) => Promise<void>) {
    const request = generation.current;
    dispatch({ type: "runStart" });
    try {
      await task(request);
    } catch (e) {
      if (request === generation.current)
        dispatch({ type: "runFailure", error: localError(e, t) });
    } finally {
      if (request === generation.current) dispatch({ type: "runEnd" });
    }
  }

  function upsert(item: LocalCheckout, request: number) {
    if (request !== generation.current) return;
    dispatch({ type: "upsert", item });
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
      dispatch({ type: "setParent", parent: null });
    });
  }

  async function unlink(path: string) {
    if (busy) return;
    await run(async (request) => {
      await unlinkLocalCheckout(fullName, path);
      if (request !== generation.current) return;
      const rows = await listLocalCheckouts();
      if (request === generation.current)
        dispatch({
          type: "listSuccess",
          items: rows.filter((row) => row.fullName === fullName),
        });
    });
  }

  async function chooseCloneParent() {
    await run(async (request) => {
      const path = await chooseLocalFolder();
      if (path && request === generation.current)
        dispatch({ type: "setParent", parent: path });
    });
  }

  async function open(path: string, target: "folder" | EditorTarget) {
    await run(() => openLocalCheckout(fullName, path, target));
  }

  function setName(next: string) {
    dispatch({ type: "setName", name: next });
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
    dispatch({ type: "setParent", parent: null });
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
