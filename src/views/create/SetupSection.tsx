import { Button } from "../../components/Button";
import { Select } from "../../components/Select";
import { useI18n } from "../../lib/i18n";
import type { CreateFormApi } from "./useCreateForm";

export function SetupSection({ form }: { form: CreateFormApi }) {
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
        <label className="flex items-center gap-3 text-[13px]">
          <input
            type="checkbox"
            checked={readme}
            onChange={(event) => setReadme(event.target.checked)}
            className="accent-accent"
          />
          {t("Add a README")}
        </label>
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
              onChange={setGitignore}
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
              onChange={setLicense}
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
      <label className="flex items-center gap-3 border-t border-hairline pt-5 text-[13px]">
        <input
          type="checkbox"
          checked={track}
          onChange={(event) => setTrack(event.target.checked)}
          className="accent-accent"
        />
        {t("Track this repository in Asterism")}
      </label>
      <div className="flex justify-end pb-4">
        <Button
          type="submit"
          variant="primary"
          disabled={busy || !owner || !cleanName || Boolean(invalidName)}
        >
          {busy ? t("Creating repository…") : t("Create repository")}
        </Button>
      </div>
    </>
  );
}
