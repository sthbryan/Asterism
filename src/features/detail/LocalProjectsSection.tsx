import {
  ArrowSquareOut,
  Code,
  FolderOpen,
  LinkSimple,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/app/hooks";
import { useStore } from "@/app/store";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import type { LocalCheckout, LocalCheckoutStatus } from "@/lib/types";
import {
  chooseLocalFolder,
  cloneLocalRepository,
  linkLocalCheckout,
  listLocalCheckouts,
  openLocalCheckout,
  unlinkLocalCheckout,
} from "@/services/api";
import { GitSyncPanel } from "./GitSyncPanel";

const statusKey: Record<LocalCheckoutStatus, string> = {
  ready: "local.ready",
  missing: "local.missing",
  notGit: "local.notGit",
  remoteMismatch: "local.remoteMismatch",
  unavailable: "local.unavailable",
  gitUnavailable: "local.gitUnavailable",
};
function localError(
  error: unknown,
  t: (key: string, vars?: Record<string, string | number | boolean>) => string,
) {
  const text = String(error);
  const code = [
    "LOCAL_CLONE_SAVED_FAILED",
    "LOCAL_CLONE_FAILED",
    "LOCAL_LINK_FAILED",
    "LOCAL_UNLINK_FAILED",
    "LOCAL_OPEN_FAILED",
    "LOCAL_FOLDER_FAILED",
    "LOCAL_INVALID_DIRECTORY",
    "LOCAL_DESTINATION_EXISTS",
    "LOCAL_INVALID_PATH",
    "LOCAL_GIT_UNAVAILABLE",
    "LOCAL_NOT_GIT",
    "LOCAL_REMOTE_MISMATCH",
    "LOCAL_CHECKOUT_UNAVAILABLE",
    "LOCAL_INVALID_TARGET",
    "LOCAL_EDITOR_UNAVAILABLE",
  ].find((item) => text.includes(item));
  if (!code) return text;
  const message = t(`local.errors.${code}`);
  return code === "LOCAL_CLONE_SAVED_FAILED"
    ? `${message} ${text.replace(code, "").trim()}`
    : message;
}

export function LocalProjectsSection({ fullName }: { fullName: string }) {
  const { t } = useI18n();
  const account = useStore((s) => s.account);
  const online = useStore((s) => s.status?.ok === true);
  const [items, setItems] = useState<LocalCheckout[]>([]);
  const [parent, setParent] = useState<string | null>(null);
  const [name, setName] = useState(
    fullName.split("/").slice(-1)[0] ?? "repository",
  );
  const [busy, setBusy] = useState(false);
  const [editor, setEditor] = useState<"vscode" | "cursor" | "zed">(() => {
    try {
      const value = localStorage.getItem("asterism.editor");
      return value === "cursor" || value === "zed" ? value : "vscode";
    } catch {
      return "vscode";
    }
  });
  const [error, setError] = useState<string | null>(null);
  const generation = useRef(0);
  useEffect(() => {
    const request = ++generation.current;
    let active = true;
    setItems([]);
    setError(null);
    setParent(null);
    setBusy(false);
    setName(fullName.split("/").slice(-1)[0] ?? "repository");
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
  async function link() {
    const request = generation.current;
    setBusy(true);
    setError(null);
    try {
      const path = await chooseLocalFolder();
      if (!path || request !== generation.current) return;
      const item = await linkLocalCheckout(fullName, path);
      if (request === generation.current)
        setItems((old) => [
          ...old.filter((entry) => entry.path !== item.path),
          item,
        ]);
    } catch (e) {
      if (request === generation.current) setError(localError(e, t));
    } finally {
      if (request === generation.current) setBusy(false);
    }
  }
  async function clone() {
    if (!parent || !name.trim()) return;
    const request = generation.current;
    setBusy(true);
    setError(null);
    try {
      const item = await cloneLocalRepository(fullName, parent, name.trim());
      if (request === generation.current) {
        setItems((old) => [
          ...old.filter((entry) => entry.path !== item.path),
          item,
        ]);
        setParent(null);
      }
    } catch (e) {
      if (request === generation.current) setError(localError(e, t));
    } finally {
      if (request === generation.current) setBusy(false);
    }
  }
  async function unlink(path: string) {
    if (busy) return;
    const request = generation.current;
    setBusy(true);
    setError(null);
    try {
      await unlinkLocalCheckout(fullName, path);
      if (request !== generation.current) return;
      const rows = await listLocalCheckouts();
      if (request === generation.current)
        setItems(rows.filter((row) => row.fullName === fullName));
    } catch (e) {
      if (request === generation.current) setError(localError(e, t));
    } finally {
      if (request === generation.current) setBusy(false);
    }
  }
  async function chooseCloneParent() {
    const request = generation.current;
    setBusy(true);
    setError(null);
    try {
      const path = await chooseLocalFolder();
      if (path && request === generation.current) setParent(path);
    } catch (e) {
      if (request === generation.current) setError(localError(e, t));
    } finally {
      if (request === generation.current) setBusy(false);
    }
  }
  return (
    <section className="card mt-3 p-4" aria-labelledby="local-projects-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="local-projects-heading" className="text-[13px] font-semibold">
          {t("local.title")}
        </h2>
        <div className="flex gap-2">
          <Button disabled={busy} onClick={() => void link()}>
            <LinkSimple size={14} />
            {t("local.link")}
          </Button>
          <Button
            disabled={busy || !online}
            onClick={() => void chooseCloneParent()}
          >
            <Plus size={14} />
            {t("local.clone")}
          </Button>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <label htmlFor="local-editor" className="text-xs text-mist">
          {t("local.editor")}
        </label>
        <Select
          id="local-editor"
          value={editor}
          onChange={(value) => {
            const next = value as typeof editor;
            setEditor(next);
            try {
              localStorage.setItem("asterism.editor", next);
            } catch {
              /* best effort */
            }
          }}
          options={[
            { value: "vscode", label: "VS Code" },
            { value: "cursor", label: "Cursor" },
            { value: "zed", label: "Zed" },
          ]}
          className="w-36"
          ariaLabelledBy="local-editor"
        />
      </div>
      {parent ? (
        <div className="mt-3 rounded-md border border-hairline bg-wash p-3">
          <p className="text-xs text-mist">
            {t("local.destination", { path: `${parent}/${name}` })}
          </p>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label={t("local.name")}
            className="mt-2"
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button disabled={busy} size="md" onClick={() => setParent(null)}>
              {t("Cancel")}
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={busy || !online || !name.trim()}
              onClick={() => void clone()}
            >
              {busy ? t("local.cloning") : t("local.confirmClone")}
            </Button>
          </div>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mt-3 text-sm text-accent-soft">
          {t("local.error")} {error}
        </p>
      ) : null}
      <div className="mt-3 space-y-2">
        {items.length === 0 ? (
          <p className="text-[13px] text-faint">{t("local.empty")}</p>
        ) : (
          items.map((item) => (
            <div
              key={item.path}
              className="rounded-md border border-hairline px-3 py-2"
            >
              <div className="flex items-start gap-2">
                <FolderOpen size={15} className="mt-0.5 shrink-0 text-faint" />
                <div className="min-w-0 flex-1">
                  <p
                    className="truncate text-[12.5px] font-medium"
                    title={item.path}
                  >
                    {item.path}
                  </p>
                  <p className="mt-1 text-[11px] text-faint">
                    {t(statusKey[item.status])}
                    {item.branch ? ` · ${item.branch}` : ""}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    disabled={busy || item.status !== "ready"}
                    onClick={() =>
                      void openLocalCheckout(
                        fullName,
                        item.path,
                        "folder",
                      ).catch((e) => setError(localError(e, t)))
                    }
                  >
                    <ArrowSquareOut size={14} aria-hidden />
                    {t("local.open")}
                  </Button>
                  <Button
                    disabled={busy || item.status !== "ready"}
                    onClick={() =>
                      void openLocalCheckout(fullName, item.path, editor).catch(
                        (e) => setError(localError(e, t)),
                      )
                    }
                  >
                    <Code size={14} aria-hidden />
                    {t("local.editor")}
                  </Button>
                  <Button
                    disabled={busy}
                    onClick={() => void unlink(item.path)}
                    aria-label={t("local.unlink")}
                  >
                    <Trash size={14} />
                  </Button>
                </div>
              </div>
              {item.status === "ready" ? (
                <GitSyncPanel fullName={fullName} path={item.path} />
              ) : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
