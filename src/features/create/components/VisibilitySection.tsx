import { useI18n } from "@/app/hooks";
import type { CreateFormApi } from "../hooks/useCreateForm";

type VisibilityForm = Pick<CreateFormApi, "visibility" | "setVisibility">;

export function VisibilitySection({ form }: { form: VisibilityForm }) {
  const { t } = useI18n();
  const { visibility, setVisibility } = form;
  return (
    <fieldset>
      <legend className="text-[13px] font-medium">{t("Visibility")}</legend>
      <div className="mt-3 space-y-3">
        {[
          [
            "private",
            t("Private"),
            t("Only you and people you grant access can see this repository."),
          ],
          [
            "public",
            t("Public"),
            t("Anyone on the internet can see this repository."),
          ],
        ].map(([value, label, hint]) => (
          <label key={value} className="flex items-start gap-3 text-[13px]">
            <input
              type="radio"
              name="visibility"
              value={value}
              checked={visibility === value}
              onChange={() => setVisibility(value)}
              className="mt-1 accent-accent"
            />
            <span>
              <span className="font-medium">{label}</span>
              <span className="mt-1 block text-xs text-mist">{hint}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
