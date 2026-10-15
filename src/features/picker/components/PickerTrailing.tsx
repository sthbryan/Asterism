import { Button } from "@zovaris/sephiro";
import { When } from "react-if";
import { useI18n } from "@/app/hooks";

export function PickerTrailing({
  dirty,
  loading,
  onCancel,
  onSave,
}: {
  dirty: boolean;
  loading: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  const { t } = useI18n();
  return (
    <>
      <Button variant="quiet" size="sm" onClick={onCancel}>
        {t("Cancel")}
      </Button>
      <When condition={dirty}>
        <Button variant="primary" size="sm" onClick={onSave} disabled={loading}>
          {t("Save changes")}
        </Button>
      </When>
    </>
  );
}
