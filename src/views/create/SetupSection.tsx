import { Button } from "../../components/Button";
import { fieldClass } from "./fields";
import type { CreateFormApi } from "./useCreateForm";

export function SetupSection({ form }: { form: CreateFormApi }) {
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
          Add a README
        </label>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-[13px] font-medium">
            .gitignore
            <select
              className={fieldClass}
              value={gitignore}
              onChange={(event) => setGitignore(event.target.value)}
            >
              <option value="">None</option>
              {options?.gitignores.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="text-[13px] font-medium">
            License
            <select
              className={fieldClass}
              value={license}
              onChange={(event) => setLicense(event.target.value)}
            >
              <option value="">None</option>
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
        Track this repository in Asterism
      </label>
      <div className="flex justify-end pb-4">
        <Button
          type="submit"
          variant="primary"
          disabled={busy || !owner || !cleanName || Boolean(invalidName)}
        >
          {busy ? "Creating repository…" : "Create repository"}
        </Button>
      </div>
    </>
  );
}
