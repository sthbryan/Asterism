import { Button } from "../../components/Button";

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
  return (
    <>
      <Button variant="quiet" onClick={onCancel}>
        Cancel
      </Button>
      {dirty ? (
        <Button variant="primary" onClick={onSave} disabled={loading}>
          Save changes
        </Button>
      ) : null}
    </>
  );
}
