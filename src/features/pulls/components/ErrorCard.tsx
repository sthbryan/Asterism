import { WarningCircleIcon } from "@phosphor-icons/react";
import { useI18n } from "@/app/hooks";

export function ErrorCard({ message }: { message: string }) {
  const { t } = useI18n();
  return (
    <div className="card mb-3 flex items-start gap-3 p-4 text-[13px] text-accent-soft">
      <WarningCircleIcon size={16} />
      <div>
        <p>{t("pulls.error")}</p>
        <p className="mt-1 break-words text-mist">{message}</p>
      </div>
    </div>
  );
}
