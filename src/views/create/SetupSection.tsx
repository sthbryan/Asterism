import { Button } from "../../components/Button";
import { useI18n } from "../../lib/i18n";
import { fieldClass } from "./fields";
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
          <label className="text-[13px] font-medium">
            .gitignore
            <select
              className={fieldClass}
              value={gitignore}
              onChange={(event) => setGitignore(event.target.value)}
            >
              <option value="">{t("None")}</option>
              {options?.gitignores.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="text-[13px] font-medium">
            {t("License")}
            <select
              className={fieldClass}
              value={license}
              onChange={(event) => setLicense(event.target.value)}
            >
              <option value="">{t("None")}</option>
              {options?.licenses.map((item) => (
                <option key={item.key} value={item.key}>
                  {item.name}
                </option>
              ))}
            </select>
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
