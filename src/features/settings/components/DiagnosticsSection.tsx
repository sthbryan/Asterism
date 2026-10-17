import { TerminalWindowIcon } from "@phosphor-icons/react";
import { Button, Notice } from "@zovaris/sephiro";
import { When } from "react-if";
import { useI18n } from "@/app/hooks";
import { isMockMode } from "@/services/api";
import { useDiagnostics } from "../hooks/useDiagnostics";

export function DiagnosticsSection() {
  const { t } = useI18n();
  const { diagnostics, error, loading, retry } = useDiagnostics();

  return (
    <section aria-labelledby="diagnostics-heading" className="app-section">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="app-chip">
            <TerminalWindowIcon size={15} />
          </span>
          <h2 id="diagnostics-heading" className="kpi-label text-faint">
            {t("settings.diagnostics")}
          </h2>
        </div>
        <Button
          variant="secondary"
          size="sm"
          disabled={loading}
          onClick={retry}
        >
          {loading ? t("settings.checking") : t("Refresh")}
        </Button>
      </div>
      <p className="mt-2 text-sm text-mist">{t("settings.diagnosticsHint")}</p>
      <When condition={isMockMode()}>
        <p className="mt-2 text-sm text-mist">{t("settings.demo")}</p>
      </When>
      <When condition={Boolean(error)}>
        <Notice variant="danger" className="mt-3">
          {t("settings.diagnosticsError")} {error}
        </Notice>
      </When>
      <When condition={Boolean(diagnostics)}>
        <dl className="mt-3 divide-y divide-hairline">
          {[
            ["GitHub CLI", diagnostics?.ghVersion, diagnostics?.ghError],
            ["Git", diagnostics?.gitVersion, diagnostics?.gitError],
            [t("settings.configPath"), diagnostics?.configPath, null],
            [t("settings.historyPath"), diagnostics?.historyPath, null],
          ].map(([label, value, issue]) => (
            <div
              key={label}
              className="grid gap-1 py-2.5 sm:grid-cols-[160px_1fr]"
            >
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
    </section>
  );
}
