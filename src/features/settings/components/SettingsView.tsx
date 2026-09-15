import { useI18n } from "@/app/hooks";
import { PageHeader } from "@/components/PageHeader";
import { AccountSection } from "./AccountSection";
import { AppearanceSection } from "./AppearanceSection";
import { DiagnosticsSection } from "./DiagnosticsSection";

export function SettingsView() {
  const { t } = useI18n();

  return (
    <>
      <PageHeader
        title={
          <h1 className="text-[15px] font-semibold">{t("settings.title")}</h1>
        }
      />
      <div className="h-full overflow-auto px-6 py-5">
        <div className="max-w-3xl space-y-8">
          <AppearanceSection />
          <AccountSection />
          <DiagnosticsSection />
        </div>
      </div>
    </>
  );
}
