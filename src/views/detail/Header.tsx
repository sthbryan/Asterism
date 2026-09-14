import { ArrowSquareOut, CaretLeft } from "@phosphor-icons/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { useI18n } from "../../lib/i18n";

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
        <CaretLeft size={13} />
        {t("Overview")}
      </button>
      <span className="text-faint">/</span>
      <span className="font-mono text-[13px] font-semibold">
        {fullName ?? "…"}
      </span>
    </nav>
  );
}

export function DetailTrailing({ fullName }: { fullName?: string }) {
  if (!fullName) return null;
  return (
    <button
      type="button"
      onClick={() => {
        void openUrl(`https://github.com/${fullName}`);
      }}
      className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12.5px] font-medium text-mist transition-colors hover:bg-fill hover:text-paper"
    >
      GitHub
      <ArrowSquareOut size={12} />
    </button>
  );
}
