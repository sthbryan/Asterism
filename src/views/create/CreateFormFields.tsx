import { useI18n } from "../../app/hooks";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Select } from "../../components/Select";
import { isMockMode } from "../../lib/api";
import { SetupSection } from "./SetupSection";
import type { CreateFormApi } from "./useCreateForm";
import { VisibilitySection } from "./VisibilitySection";

export function CreateFormFields({ form }: { form: CreateFormApi }) {
  const { t } = useI18n();
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
      <h2 className="text-xl font-semibold tracking-[-0.02em]">
        {t("A new home for your project")}
      </h2>
      <p className="mt-2 text-[13px] leading-relaxed text-mist">
        {t("Create a repository on GitHub and start tracking it in Asterism.")}
      </p>
      {isMockMode() && (
        <p className="mt-3 text-sm text-mist">
          {t("Demo mode — no repository will be created on GitHub.")}
        </p>
      )}
      {loading && (
        <p role="status" className="mt-5 text-sm text-mist">
          {t("Loading repository options…")}
        </p>
      )}
      {error && (
        <div role="alert" className="mt-5 text-sm text-accent-soft">
          <p>{t("errors.request")}</p>
          <p className="mt-1 whitespace-pre-wrap break-words">{error}</p>
          {!options && (
            <Button className="mt-3" onClick={retry} type="button">
              {t("Retry loading")}
            </Button>
          )}
        </div>
      )}
      <fieldset
        disabled={busy || loading || !options}
        className="mt-7 space-y-6 disabled:opacity-60"
      >
        <div className="grid gap-4 sm:grid-cols-[1fr_2fr]">
          <label
            id="create-owner-label"
            htmlFor="create-owner"
            className="text-[13px] font-medium"
          >
            {t("Owner")}
            <Select
              id="create-owner"
              value={owner}
              onChange={setOwner}
              className="mt-2"
              ariaLabelledBy="create-owner-label"
              options={
                options?.owners.map((item) => ({ value: item, label: item })) ??
                []
              }
            />
          </label>
          <label
            htmlFor="create-repository-name"
            className="text-[13px] font-medium"
          >
            {t("Repository name")}
            <Input
              id="create-repository-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={100}
              required
              autoComplete="off"
              placeholder={t("my-project")}
              invalid={Boolean(invalidName)}
              aria-describedby="name-help"
            />
          </label>
        </div>
        <p id="name-help" className="-mt-3 text-xs text-mist">
          {invalidName
            ? t(
                "Use letters, numbers, periods, hyphens or underscores. Names cannot be . or .., or end in .git.",
              )
            : `${owner || t("owner")}/${cleanName || t("my-project")}`}
        </p>
        <label
          htmlFor="create-description"
          className="block text-[13px] font-medium"
        >
          {t("Description")}{" "}
          <span className="font-normal text-mist">{t("(optional)")}</span>
          <Input
            id="create-description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            maxLength={350}
            placeholder={t("What does this project do?")}
          />
        </label>
        <VisibilitySection form={form} />
        <SetupSection form={form} />
      </fieldset>
    </form>
  );
}
