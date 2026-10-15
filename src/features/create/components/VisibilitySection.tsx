import { RadioGroup } from "@zovaris/sephiro";
import { useI18n } from "@/app/hooks";
import type { CreateFormApi } from "../hooks/useCreateForm";

type VisibilityForm = Pick<CreateFormApi, "visibility" | "setVisibility">;

export function VisibilitySection({ form }: { form: VisibilityForm }) {
  const { t } = useI18n();
  const { visibility, setVisibility } = form;
  return (
    <RadioGroup
      name="visibility"
      label={t("Visibility")}
      value={visibility}
      onValueChange={(value) => {
        if (value === "private" || value === "public") setVisibility(value);
      }}
      size="sm"
      options={[
        {
          value: "private",
          label: t("Private"),
          description: t(
            "Only you and people you grant access can see this repository.",
          ),
        },
        {
          value: "public",
          label: t("Public"),
          description: t("Anyone on the internet can see this repository."),
        },
      ]}
    />
  );
}
