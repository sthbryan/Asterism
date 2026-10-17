import { Button, Field, Input, Notice, Select } from "@zovaris/sephiro";
import { When } from "react-if";
import { useI18n } from "@/app/hooks";
import { Section } from "@/components/Section";
import { isMockMode } from "@/services/api";
import type { CreateFormApi } from "../hooks/useCreateForm";
import { SetupSection } from "./SetupSection";
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
      <div className="app-section-flush">
        <h2 className="text-[21px] leading-tight font-semibold tracking-[-0.02em]">
          {t("A new home for your project")}
        </h2>
        <p className="mt-2 text-[13px] leading-relaxed text-mist">
          {t(
            "Create a repository on GitHub and start tracking it in Asterism.",
          )}
        </p>
        <When condition={isMockMode()}>
          <p className="mt-3 text-sm text-mist">
            {t("Demo mode — no repository will be created on GitHub.")}
          </p>
        </When>
        <When condition={loading}>
          <p role="status" className="mt-5 text-sm text-mist">
            {t("Loading repository options…")}
          </p>
        </When>
        <When condition={Boolean(error)}>
          <Notice variant="danger" className="mt-5">
            <p>{t("errors.request")}</p>
            <p className="mt-1 whitespace-pre-wrap break-words">{error}</p>
            <When condition={!options}>
              <Button
                className="mt-3"
                onClick={retry}
                type="button"
                variant="secondary"
                size="sm"
              >
                {t("Retry loading")}
              </Button>
            </When>
          </Notice>
        </When>
      </div>
      <fieldset
        disabled={busy || loading || !options}
        className="mt-4 space-y-4"
      >
        <Section label={t("Details")}>
          <div className="grid items-start gap-4 sm:grid-cols-[1fr_2fr]">
            <Field label={t("Owner")} htmlFor="create-owner">
              <Select
                id="create-owner"
                value={owner}
                onValueChange={setOwner}
                size="sm"
                options={
                  options?.owners.map((item) => ({
                    value: item,
                    label: item,
                  })) ?? []
                }
              />
            </Field>
            <Field
              label={t("Repository name")}
              htmlFor="create-repository-name"
              message={
                invalidName
                  ? t(
                      "Use letters, numbers, periods, hyphens or underscores. Names cannot be . or .., or end in .git.",
                    )
                  : `${owner || t("owner")}/${cleanName || t("my-project")}`
              }
              messageType={invalidName ? "error" : "hint"}
            >
              <Input
                id="create-repository-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={100}
                required
                className="mt-0"
                size="sm"
                autoComplete="off"
                placeholder={t("my-project")}
                invalid={Boolean(invalidName)}
              />
            </Field>
          </div>

          <div className="mt-4">
            <Field
              htmlFor="create-description"
              label={
                <>
                  {t("Description")}{" "}
                  <span className="font-normal text-mist">
                    {t("(optional)")}
                  </span>
                </>
              }
            >
              <Input
                id="create-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                maxLength={350}
                className="mt-0"
                size="sm"
                placeholder={t("What does this project do?")}
              />
            </Field>
          </div>
        </Section>

        <Section>
          <VisibilitySection form={form} />
        </Section>

        <Section label={t("Initialize")}>
          <SetupSection form={form} />
        </Section>
      </fieldset>
    </form>
  );
}
