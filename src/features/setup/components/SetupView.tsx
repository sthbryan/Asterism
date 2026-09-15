import { When } from "react-if";
import { useI18n } from "@/app/hooks";
import { useStore } from "@/app/store";
import { PageHeader } from "@/components/PageHeader";
import { ErrorScreen } from "./ErrorScreen";

export function SetupView() {
  const { t } = useI18n();
  const status = useStore((s) => s.status);
  const retryBoot = useStore((s) => s.retryBoot);

  const screen = status ? (
    <ErrorScreen status={status} onRetry={retryBoot} />
  ) : null;

  return (
    <When condition={Boolean(status)}>
      <PageHeader
        title={
          <h1 className="text-[15px] font-semibold tracking-[-0.01em]">
            {t("Setup")}
          </h1>
        }
      />
      {screen}
    </When>
  );
}
