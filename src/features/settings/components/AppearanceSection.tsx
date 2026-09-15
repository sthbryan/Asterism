import { When } from "react-if";
import { useI18n } from "@/app/hooks";
import { useStore } from "@/app/store";
import { useAppearance } from "@/components/Appearance";
import { Select } from "@/components/Select";
import { Toggle } from "@/components/Toggle";
import type { Locale, ThemePref } from "@/lib/types";

export function AppearanceSection() {
  const { t, locale, setLocale } = useI18n();
  const {
    theme,
    setTheme,
    transparency,
    setTransparency,
    error: appearanceError,
  } = useAppearance();
  const preferenceError = useStore((s) => s.preferenceError);

  return (
    <section aria-labelledby="appearance-heading">
      <h2 id="appearance-heading" className="text-base font-semibold">
        {t("settings.appearance")}
      </h2>
      <p className="mt-1 text-sm text-mist">{t("settings.saved")}</p>
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <label
          id="app-language-label"
          htmlFor="app-language"
          className="text-sm font-medium"
        >
          {t("settings.language")}
        </label>
        <Select
          id="app-language"
          value={locale}
          className="min-w-40"
          ariaLabelledBy="app-language-label"
          options={[
            { value: "es", label: "Español" },
            { value: "en", label: "English" },
          ]}
          onChange={(value) => setLocale(value as Locale)}
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label
          id="app-theme-label"
          htmlFor="app-theme"
          className="text-sm font-medium"
        >
          {t("settings.theme")}
        </label>
        <Select
          id="app-theme"
          value={theme}
          className="min-w-40"
          ariaLabelledBy="app-theme-label"
          options={[
            { value: "light", label: t("settings.light") },
            { value: "dark", label: t("settings.dark") },
            { value: "system", label: t("settings.system") },
          ]}
          onChange={(value) => setTheme(value as ThemePref)}
        />
      </div>
      <div className="mt-5 flex items-center justify-between gap-6">
        <div>
          <p className="text-sm font-medium">{t("settings.transparency")}</p>
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
      <When condition={Boolean(appearanceError || preferenceError)}>
        <div role="alert" className="mt-4 text-sm text-accent-soft">
          <p>{t("settings.saveError")}</p>
          <p className="mt-1 wrap-break-word">
            {appearanceError || preferenceError}
          </p>
        </div>
      </When>
    </section>
  );
}
