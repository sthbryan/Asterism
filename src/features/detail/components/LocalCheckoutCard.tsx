import {
  ArrowSquareOutIcon,
  CodeIcon,
  FolderOpenIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { When } from "react-if";
import { useI18n } from "@/app/hooks";
import { Button } from "@/components/Button";
import type { LocalCheckout } from "@/lib/types";
import type { EditorTarget } from "../hooks/useLocalCheckouts";
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
    <div className="rounded-md border border-hairline px-3 py-2">
      <div className="flex items-start gap-2">
        <FolderOpenIcon size={15} className="mt-0.5 shrink-0 text-faint" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-medium" title={item.path}>
            {item.path}
          </p>
          <p className="mt-1 text-[11px] text-faint">
            {t(statusKey[item.status])}
            {item.branch ? ` · ${item.branch}` : ""}
          </p>
        </div>
        <div className="flex gap-1">
          <Button
            disabled={busy || !ready}
            onClick={() => onOpen(item.path, "folder")}
          >
            <ArrowSquareOutIcon size={14} aria-hidden />
            {t("local.open")}
          </Button>
          <Button
            disabled={busy || !ready}
            onClick={() => onOpen(item.path, editor)}
          >
            <CodeIcon size={14} aria-hidden />
            {t("local.editor")}
          </Button>
          <Button
            disabled={busy}
            onClick={() => onUnlink(item.path)}
            aria-label={t("local.unlink")}
          >
            <TrashIcon size={14} />
          </Button>
        </div>
      </div>
      <When condition={ready}>
        <GitSyncPanel fullName={fullName} path={item.path} />
      </When>
    </div>
  );
}
