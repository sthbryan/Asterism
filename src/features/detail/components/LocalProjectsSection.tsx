import {
  FolderDashedIcon,
  FolderSimpleIcon,
  LinkSimpleIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { Button, Input } from "@zovaris/sephiro";
import { Else, If, Then, When } from "react-if";
import { useI18n } from "@/app/hooks";
import { Section } from "@/components/Section";
import { useLocalCheckouts } from "../hooks/useLocalCheckouts";
import { LocalCheckoutCard } from "./LocalCheckoutCard";

export function LocalProjectsSection({ fullName }: { fullName: string }) {
  const { t } = useI18n();
  const {
    items,
    busy,
    error,
    parent,
    name,
    setName,
    editor,
    link,
    confirmClone,
    cancelClone,
    unlink,
    chooseCloneParent,
    open,
  } = useLocalCheckouts(fullName);

  return (
    <Section
      labelAs="h2"
      label={t("local.title")}
      icon={<FolderSimpleIcon size={15} />}
      trailing={
        <>
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            disabled={busy}
            onClick={() => void link()}
          >
            <LinkSimpleIcon size={14} />
            {t("local.link")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            disabled={busy}
            onClick={() => void chooseCloneParent()}
          >
            <PlusIcon size={14} />
            {t("local.clone")}
          </Button>
        </>
      }
    >
      <When condition={Boolean(parent)}>
        <div className="mt-3 rounded-md border border-hairline bg-wash p-3">
          <p className="text-xs text-mist">
            {t("local.destination", { path: `${parent}/${name}` })}
          </p>
          <Input
            size="md"
            className="mt-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label={t("local.name")}
          />
          <div className="mt-3 flex justify-end gap-2">
            <Button
              variant="secondary"
              className="shrink-0"
              disabled={busy}
              size="md"
              onClick={cancelClone}
            >
              {t("Cancel")}
            </Button>
            <Button
              variant="primary"
              className="shrink-0"
              size="md"
              disabled={busy || !name.trim()}
              onClick={() => void confirmClone()}
            >
              {busy ? t("local.cloning") : t("local.confirmClone")}
            </Button>
          </div>
        </div>
      </When>

      <When condition={Boolean(error)}>
        <p role="alert" className="mt-3 text-sm text-accent-soft">
          {t("local.error")} {error}
        </p>
      </When>

      <div className="mt-3 divide-y divide-hairline border-t border-hairline pt-3">
        <If condition={items.length === 0}>
          <Then>
            <div className="flex items-center gap-2.5 rounded-lg border border-dashed border-hairline px-3 py-2.5 text-[12.5px] text-faint">
              <FolderDashedIcon size={15} className="shrink-0" />
              {t("local.empty")}
            </div>
          </Then>
          <Else>
            {items.map((item) => (
              <LocalCheckoutCard
                key={item.path}
                fullName={fullName}
                item={item}
                busy={busy}
                editor={editor}
                onOpen={(path, target) => void open(path, target)}
                onUnlink={(path) => void unlink(path)}
              />
            ))}
          </Else>
        </If>
      </div>
    </Section>
  );
}
