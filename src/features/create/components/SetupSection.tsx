import { Button, Checkbox, Select } from "@zovaris/sephiro";
import { useI18n } from "@/app/hooks";
import type { CreateFormApi } from "../hooks/useCreateForm";

type SetupForm = Pick<
  CreateFormApi,
  | "options"
  | "readme"
  | "setReadme"
  | "gitignore"
  | "setGitignore"
  | "license"
  | "setLicense"
  | "track"
  | "setTrack"
  | "busy"
  | "owner"
  | "cleanName"
  | "invalidName"
>;

export function SetupSection({ form }: { form: SetupForm }) {
  const { t } = useI18n();
  const {
    options,
    readme,
    setReadme,
    gitignore,
    setGitignore,
    license,
    setLicense,
    track,
    setTrack,
    busy,
    owner,
    cleanName,
    invalidName,
  } = form;

  return (
    <>
      <div className="border-t border-hairline pt-5">
        <Checkbox
          size="sm"
          checked={readme}
          onChange={(event) => setReadme(event.target.checked)}
          label={t("Add a README")}
        />
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label
            id="create-gitignore-label"
            htmlFor="create-gitignore"
            className="text-[13px] font-medium"
          >
            .gitignore
            <Select
              id="create-gitignore"
              value={gitignore}
              className="mt-2"
              ariaLabelledBy="create-gitignore-label"
              onValueChange={setGitignore}
              size="sm"
              options={[
                { value: "", label: t("None") },
                ...(options?.gitignores.map((item) => ({
                  value: item,
                  label: item,
                })) ?? []),
              ]}
            />
          </label>
          <label
            id="create-license-label"
            htmlFor="create-license"
            className="text-[13px] font-medium"
          >
            {t("License")}
            <Select
              id="create-license"
              value={license}
              className="mt-2"
              ariaLabelledBy="create-license-label"
              onValueChange={setLicense}
              size="sm"
              options={[
                { value: "", label: t("None") },
                ...(options?.licenses.map((item) => ({
                  value: item.key,
                  label: item.name,
                })) ?? []),
              ]}
            />
          </label>
        </div>
      </div>
      <div className="border-t border-hairline pt-5">
        <Checkbox
          size="sm"
          checked={track}
          onChange={(event) => setTrack(event.target.checked)}
          label={t("Track this repository in Asterism")}
        />
      </div>
      <div className="flex justify-end pb-4">
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={busy || !owner || !cleanName || Boolean(invalidName)}
        >
          {busy ? t("Creating repository…") : t("Create repository")}
        </Button>
      </div>
    </>
  );
}
