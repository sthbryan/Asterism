import { useEffect, useState } from "react";
import { useStore } from "../app/store";
import { useAppearance } from "../components/Appearance";
import { Button } from "../components/Button";
import { Toggle } from "../components/Toggle";
import { getDiagnostics, isMockMode } from "../lib/api";
import { useI18n } from "../lib/i18n";
import type { Diagnostics, Locale, ThemePref } from "../lib/types";

const selectClass =
  "h-9 min-w-40 rounded-md border border-hairline bg-night px-3 text-sm text-paper focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

export function SettingsView() {
  const { t, locale, setLocale } = useI18n();
  const {
    theme,
    setTheme,
    transparency,
    setTransparency,
    error: appearanceError,
  } = useAppearance();
  const { state, retryBoot } = useStore();
  const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    void attempt;
    setLoading(true);
    setError(null);
    getDiagnostics()
      .then((value) => {
        if (active) setDiagnostics(value);
      })
      .catch((err) => {
        if (active) setError(String(err));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [attempt]);
  return (
    <div className="h-full overflow-auto px-6 py-5">
      <div className="max-w-3xl space-y-8">
        <section aria-labelledby="appearance-heading">
          <h2 id="appearance-heading" className="text-base font-semibold">
            {t("settings.appearance")}
          </h2>
          <p className="mt-1 text-sm text-mist">{t("settings.saved")}</p>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <label htmlFor="app-language" className="text-sm font-medium">
              {t("settings.language")}
            </label>
            <select
              id="app-language"
              className={selectClass}
              value={locale}
              onChange={(e) => setLocale(e.target.value as Locale)}
            >
              <option value="es" lang="es">
                Español
              </option>
              <option value="en" lang="en">
                English
              </option>
            </select>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <label htmlFor="app-theme" className="text-sm font-medium">
              {t("settings.theme")}
            </label>
            <select
              id="app-theme"
              className={selectClass}
              value={theme}
              onChange={(e) => setTheme(e.target.value as ThemePref)}
            >
              <option value="light">{t("settings.light")}</option>
              <option value="dark">{t("settings.dark")}</option>
              <option value="system">{t("settings.system")}</option>
            </select>
          </div>
          <div className="mt-5 flex items-center justify-between gap-6">
            <div>
              <p className="text-sm font-medium">
                {t("settings.transparency")}
              </p>
              <p className="mt-1 text-sm text-mist">
                {t("settings.transparencyHint")}
              </p>
            </div>
            <Toggle
              on={transparency}
              onChange={setTransparency}
              label={t("settings.transparency")}
            />
          </div>
          {(appearanceError || state.preferenceError) && (
            <div role="alert" className="mt-4 text-sm text-accent-soft">
              <p>{t("settings.saveError")}</p>
              <p className="mt-1 break-words">
                {appearanceError || state.preferenceError}
              </p>
            </div>
          )}
        </section>
        <section
          aria-labelledby="account-heading"
          className="border-t border-hairline pt-5"
        >
          <h2 id="account-heading" className="text-base font-semibold">
            {t("settings.account")}
          </h2>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">
                {state.status?.login ?? t("settings.noAccount")}
              </p>
              <p className="mt-1 text-sm text-mist">
                {state.status?.ok
                  ? t("GitHub · connected")
                  : t("settings.disconnected")}
              </p>
            </div>
            <Button onClick={retryBoot}>{t("Check connection")}</Button>
          </div>
        </section>
        <section
          aria-labelledby="diagnostics-heading"
          className="border-t border-hairline pt-5"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="diagnostics-heading" className="text-base font-semibold">
              {t("settings.diagnostics")}
            </h2>
            <Button disabled={loading} onClick={() => setAttempt((n) => n + 1)}>
              {loading ? t("settings.checking") : t("Refresh")}
            </Button>
          </div>
          <p className="mt-2 text-sm text-mist">
            {t("settings.diagnosticsHint")}
          </p>
          {isMockMode() && (
            <p className="mt-2 text-sm text-mist">{t("settings.demo")}</p>
          )}
          {error && (
            <p
              role="alert"
              className="mt-3 break-words text-sm text-accent-soft"
            >
              {t("settings.diagnosticsError")} {error}
            </p>
          )}
          {diagnostics && (
            <dl className="mt-4 space-y-4">
              {[
                ["GitHub CLI", diagnostics.ghVersion, diagnostics.ghError],
                ["Git", diagnostics.gitVersion, diagnostics.gitError],
                [t("settings.configPath"), diagnostics.configPath, null],
                [t("settings.cachePath"), diagnostics.cachePath, null],
                [t("settings.historyPath"), diagnostics.historyPath, null],
              ].map(([label, value, issue]) => (
                <div
                  key={label}
                  className="grid gap-1 sm:grid-cols-[160px_1fr]"
                >
                  <dt className="text-sm text-mist">{label}</dt>
                  <dd className="min-w-0 break-words font-mono text-xs leading-relaxed">
                    {value || t("Unavailable")}
                    {issue && <p className="mt-1 text-accent-soft">{issue}</p>}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          <p className="mt-5 text-sm leading-relaxed text-mist">
            {t("settings.localData")}
          </p>
        </section>
      </div>
    </div>
  );
}
