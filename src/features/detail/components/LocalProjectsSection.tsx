import { LinkSimpleIcon, PlusIcon } from "@phosphor-icons/react";
import { useI18n } from "@/app/hooks";
import { Button } from "@/components/Button";
import { Input } from "@/components/Input";
import { Select } from "@/components/Select";
import { useLocalCheckouts } from "../hooks/useLocalCheckouts";
import { LocalCheckoutCard } from "./LocalCheckoutCard";

export function LocalProjectsSection({ fullName }: { fullName: string }) {
  const { t } = useI18n();
  const {
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
  } = useLocalCheckouts(fullName);

  return (
    <section className="card mt-3 p-4" aria-labelledby="local-projects-heading">
      <div className="flex items-center justify-between gap-3">
        <h2 id="local-projects-heading" className="text-[13px] font-semibold">
          {t("local.title")}
        </h2>
        <div className="flex gap-2">
          <Button disabled={busy} onClick={() => void link()}>
            <LinkSimpleIcon size={14} />
            {t("local.link")}
          </Button>
          <Button
            disabled={busy || !online}
            onClick={() => void chooseCloneParent()}
          >
            <PlusIcon size={14} />
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
          onChange={(value) => setEditor(value as typeof editor)}
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
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button disabled={busy} size="md" onClick={cancelClone}>
              {t("Cancel")}
            </Button>
            <Button
              variant="primary"
              size="md"
              disabled={busy || !online || !name.trim()}
              onClick={() => void confirmClone()}
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
            <LocalCheckoutCard
              key={item.path}
              fullName={fullName}
              item={item}
              busy={busy}
              editor={editor}
              onOpen={(path, target) => void open(path, target)}
              onUnlink={(path) => void unlink(path)}
            />
          ))
        )}
      </div>
    </section>
  );
}
