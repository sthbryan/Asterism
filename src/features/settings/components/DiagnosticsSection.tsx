import { When } from "react-if";
import { useI18n } from "@/app/hooks";
import { Button } from "@/components/Button";
import { isMockMode } from "@/services/api";
import { useDiagnostics } from "../hooks/useDiagnostics";

export function DiagnosticsSection() {
  const { t } = useI18n();
  const { diagnostics, error, loading, retry } = useDiagnostics();

  return (
    <section
      aria-labelledby="diagnostics-heading"
      className="border-t border-hairline pt-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="diagnostics-heading" className="text-base font-semibold">
          {t("settings.diagnostics")}
        </h2>
        <Button disabled={loading} onClick={retry}>
          {loading ? t("settings.checking") : t("Refresh")}
        </Button>
      </div>
      <p className="mt-2 text-sm text-mist">{t("settings.diagnosticsHint")}</p>
      <When condition={isMockMode()}>
        <p className="mt-2 text-sm text-mist">{t("settings.demo")}</p>
      </When>
      <When condition={Boolean(error)}>
        <p
          role="alert"
          className="mt-3 wrap-break-word text-sm text-accent-soft"
        >
          {t("settings.diagnosticsError")} {error}
        </p>
      </When>
      <When condition={Boolean(diagnostics)}>
        <dl className="mt-4 space-y-4">
          {[
            ["GitHub CLI", diagnostics?.ghVersion, diagnostics?.ghError],
            ["Git", diagnostics?.gitVersion, diagnostics?.gitError],
            [t("settings.configPath"), diagnostics?.configPath, null],
            [t("settings.cachePath"), diagnostics?.cachePath, null],
            [t("settings.historyPath"), diagnostics?.historyPath, null],
          ].map(([label, value, issue]) => (
            <div key={label} className="grid gap-1 sm:grid-cols-[160px_1fr]">
              <dt className="text-sm text-mist">{label}</dt>
              <dd className="min-w-0 wrap-break-word font-mono text-xs leading-relaxed">
                {value || t("Unavailable")}
                <When condition={Boolean(issue)}>
                  <p className="mt-1 text-accent-soft">{issue}</p>
                </When>
              </dd>
            </div>
          ))}
        </dl>
      </When>
      <p className="mt-5 text-sm leading-relaxed text-mist">
        {t("settings.localData")}
      </p>
    </section>
  );
}
