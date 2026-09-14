import { isMockMode } from "../../lib/api";
import { Button } from "../../components/Button";
import { SetupSection } from "./SetupSection";
import { VisibilitySection } from "./VisibilitySection";
import { fieldClass } from "./fields";
import type { CreateFormApi } from "./useCreateForm";

export function CreateFormFields({ form }: { form: CreateFormApi }) {
  const {
    options,
    owner,
    setOwner,
    name,
    setName,
    description,
    setDescription,
    loading,
    busy,
    error,
    cleanName,
    invalidName,
    submit,
    retry,
  } = form;

  return (
    <form
      onSubmit={(event) => {
        void submit(event);
      }}
    >
      <h2 className="text-xl font-semibold tracking-[-0.02em]">A new home for your project</h2>
      <p className="mt-2 text-[13px] leading-relaxed text-mist">
        Create a repository on GitHub and start tracking it in Asterism.
      </p>
      {isMockMode() && (
        <p className="mt-3 text-sm text-mist">Demo mode — no repository will be created on GitHub.</p>
      )}
      {loading && (
        <p role="status" className="mt-5 text-sm text-mist">
          Loading repository options…
        </p>
      )}
      {error && (
        <div role="alert" className="mt-5 text-sm text-accent-soft">
          <p className="whitespace-pre-wrap break-words">{error}</p>
          {!options && (
            <Button className="mt-3" onClick={retry} type="button">
              Retry loading
            </Button>
          )}
        </div>
      )}
      <fieldset disabled={busy || loading || !options} className="mt-7 space-y-6 disabled:opacity-60">
        <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
          <label className="text-[13px] font-medium">
            Owner
            <select
              value={owner}
              onChange={(event) => setOwner(event.target.value)}
              className={fieldClass}
              required
            >
              {options?.owners.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="text-[13px] font-medium">
            Repository name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              className={fieldClass}
              maxLength={100}
              required
              autoComplete="off"
              placeholder="my-project"
              aria-invalid={Boolean(invalidName)}
              aria-describedby="name-help"
            />
          </label>
        </div>
        <p id="name-help" className="-mt-3 text-xs text-mist">
          {invalidName
            ? "Use letters, numbers, periods, hyphens or underscores. Names cannot be . or .., or end in .git."
            : `${owner || "owner"}/${cleanName || "my-project"}`}
        </p>
        <label className="block text-[13px] font-medium">
          Description <span className="font-normal text-mist">(optional)</span>
          <input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={350}
            className={fieldClass}
            placeholder="What does this project do?"
          />
        </label>
        <VisibilitySection form={form} />
        <SetupSection form={form} />
      </fieldset>
    </form>
  );
}
