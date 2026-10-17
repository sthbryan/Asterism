import {
  ArrowSquareOutIcon,
  CodeIcon,
  FolderOpenIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { Button, IconButton } from "@zovaris/sephiro";
import { When } from "react-if";
import { useI18n } from "@/app/hooks";
import { EDITOR_LABEL, type EditorTarget } from "@/lib/editor";
import type { LocalCheckout } from "@/lib/types";
import { statusKey } from "../utils/localUtils";
import { GitSyncPanel } from "./GitSyncPanel";

type CheckoutCardProps = {
  fullName: string;
  item: LocalCheckout;
  busy: boolean;
  editor: EditorTarget;
  onOpen: (path: string, target: "folder" | EditorTarget) => void;
  onUnlink: (path: string) => void;
};

/**
 * One checkout is a band inside the section, never a card: a card inside a card
 * is the one shape DESIGN.md rules out.
 */
export function LocalCheckoutCard({
  fullName,
  item,
  busy,
  editor,
  onOpen,
  onUnlink,
}: CheckoutCardProps) {
  const { t } = useI18n();
  const ready = item.status === "ready";

  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-2">
        <FolderOpenIcon size={15} className="shrink-0 text-faint" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-medium" title={item.path}>
            {item.path}
          </p>
          <p className="mt-0.5 text-[11px] text-faint">
            {t(statusKey[item.status])}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="secondary"
            size="sm"
            className="shrink-0"
            disabled={busy || !ready}
            onClick={() => onOpen(item.path, editor)}
          >
            <CodeIcon size={14} aria-hidden />
            {t("local.openIn", { editor: EDITOR_LABEL[editor] })}
          </Button>
          <IconButton
            icon={<ArrowSquareOutIcon size={14} />}
            label={t("local.open")}
            size="sm"
            variant="ghost"
            disabled={busy || !ready}
            onClick={() => onOpen(item.path, "folder")}
          />
          <IconButton
            icon={<TrashIcon size={14} />}
            label={t("local.unlink")}
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => onUnlink(item.path)}
          />
        </div>
      </div>
      <When condition={ready}>
        <GitSyncPanel fullName={fullName} path={item.path} />
      </When>
    </div>
  );
}
