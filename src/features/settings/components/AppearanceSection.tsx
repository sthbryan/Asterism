import { Notice, Select, Toggle } from "@zovaris/sephiro";
import { When } from "react-if";
import { useI18n } from "@/app/hooks";
import { useStore } from "@/app/store";
import { useAppearance } from "@/components/Appearance";
import type { Locale, ThemePref, ThemePreset } from "@/lib/types";

export function AppearanceSection() {
  const { t, locale, setLocale } = useI18n();
  const {
    theme,
    setTheme,
    themePreset,
    setThemePreset,
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
          onValueChange={(value) => setLocale(value as Locale)}
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <label
          id="app-preset-label"
          htmlFor="app-preset"
          className="text-sm font-medium"
        >
          {t("settings.preset")}
        </label>
        <Select
          id="app-preset"
          value={themePreset}
          className="min-w-40"
          ariaLabelledBy="app-preset-label"
          options={[
            { value: "asterism", label: "Asterism" },
            { value: "default", label: "Pine Rose" },
            { value: "fizza", label: "Fizza" },
            { value: "pulso", label: "Pulso" },
          ]}
          onValueChange={(value) => setThemePreset(value as ThemePreset)}
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
          onValueChange={(value) => setTheme(value as ThemePref)}
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
          checked={transparency}
          onCheckedChange={setTransparency}
          label={t("settings.transparency")}
        />
      </div>
      <When condition={Boolean(appearanceError || preferenceError)}>
        <Notice
          variant="danger"
          title={t("settings.saveError")}
          className="mt-4"
        >
          <p className="mt-1 wrap-break-word">
            {appearanceError || preferenceError}
          </p>
        </Notice>
      </When>
    </section>
  );
}
