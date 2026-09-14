import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { useI18n } from "@/app/hooks";
import { Input } from "@/components/Input";

export function SearchBar({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const { t } = useI18n();
  return (
    <label
      htmlFor="picker-search"
      className="flex h-9 min-w-50 flex-1 items-center gap-2 rounded-md border border-hairline bg-wash px-2.5 transition-colors focus-within:border-line"
    >
      <MagnifyingGlassIcon size={13} className="shrink-0 text-faint" />
      <Input
        id="picker-search"
        variant="compact"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t("Search by name or language…")}
        aria-label={t("Search repositories")}
      />
    </label>
  );
}
