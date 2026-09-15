import { CaretLeftIcon } from "@phosphor-icons/react";
import { useI18n } from "@/app/hooks";

export function DetailTitle({
  fullName,
  onBack,
}: {
  fullName?: string;
  onBack: () => void;
}) {
  const { t } = useI18n();
  return (
    <nav className="flex items-center gap-2 text-[13px]">
      <button
        type="button"
        onClick={onBack}
        className="-ml-2 inline-flex items-center gap-1.5 rounded-md px-2 py-1 font-medium text-mist transition-colors hover:bg-hover hover:text-paper"
      >
        <CaretLeftIcon size={13} />
        {t("Overview")}
      </button>
      <span className="text-faint">/</span>
      <span className="font-mono text-[13px] font-semibold">
        {fullName ?? "…"}
      </span>
    </nav>
  );
}
