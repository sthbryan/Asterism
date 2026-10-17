import { Button } from "@zovaris/sephiro";
import { Else, If, Then } from "react-if";
import { useI18n } from "@/app/hooks";

/** Pinned to the bottom of the picker with the pending change count. */
export function PickerFooter({
  changes,
  busy,
  onCancel,
  onSave,
}: {
  changes: { added: number; removed: number };
  busy: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  const { t } = useI18n();
  const pending = changes.added + changes.removed;
  return (
    <div className="mt-3 flex shrink-0 items-center gap-3 border-t border-hairline pt-3">
      <If condition={pending === 0}>
        <Then>
          <span className="min-w-0 flex-1 truncate text-[11.5px] text-faint">
            {t("No pending changes")}
          </span>
        </Then>
        <Else>
          <div className="flex min-w-0 flex-1 items-center gap-2 font-mono text-[11.5px] tabular">
            {changes.added > 0 && (
              <span className="text-ok">
                {t("Added count", { count: changes.added })}
              </span>
            )}
            {changes.removed > 0 && (
              <span className="text-accent-soft">
                {t("Removed count", { count: changes.removed })}
              </span>
            )}
          </div>
        </Else>
      </If>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="quiet" size="sm" onClick={onCancel}>
          {t("Cancel")}
        </Button>
        <Button
          variant="primary"
          size="sm"
          disabled={pending === 0 || busy}
          onClick={onSave}
        >
          {t("Save changes")}
        </Button>
      </div>
    </div>
  );
}
