import { MagnifyingGlass } from "@phosphor-icons/react";
import { useI18n } from "../../lib/i18n";

export function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useI18n();
  return (
    <label className="flex h-8 min-w-[200px] flex-1 items-center gap-2 rounded-md border border-hairline bg-wash px-2.5 transition-colors focus-within:border-line">
      <MagnifyingGlass size={13} className="shrink-0 text-faint" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("Search by name or language…")}
        aria-label={t("Search repositories")}
        className="h-full w-full bg-transparent text-[12.5px] leading-none outline-none placeholder:text-faint"
      />
    </label>
  );
}
