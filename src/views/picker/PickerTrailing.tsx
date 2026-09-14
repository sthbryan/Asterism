import { Button } from "../../components/Button";
import { useI18n } from "../../lib/i18n";

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
      <Button variant="quiet" onClick={onCancel}>
        {t("Cancel")}
      </Button>
      {dirty ? (
        <Button variant="primary" onClick={onSave} disabled={loading}>
          {t("Save changes")}
        </Button>
      ) : null}
    </>
  );
}
