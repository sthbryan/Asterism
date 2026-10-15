import { CaretLeftIcon } from "@phosphor-icons/react";
import { Button } from "@zovaris/sephiro";
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
      <Button
        variant="quiet"
        size="sm"
        className="-ml-2 shrink-0"
        onClick={onBack}
      >
        <CaretLeftIcon size={13} />
        {t("Overview")}
      </Button>
      <span className="text-faint">/</span>
      <span className="font-mono text-[13px] font-semibold">
        {fullName ?? "…"}
      </span>
    </nav>
  );
}
