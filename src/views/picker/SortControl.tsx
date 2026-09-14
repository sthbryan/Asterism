import { CaretDown } from "@phosphor-icons/react";
import { useI18n } from "../../lib/i18n";
import type { PickerSort } from "./usePicker";

const OPTIONS: { value: PickerSort; label: string }[] = [
  { value: "selected", label: "Selected first" },
  { value: "name", label: "Name A–Z" },
  { value: "stars", label: "Stars ↓" },
];

export function SortControl({
  value,
  onChange,
}: {
  value: PickerSort;
  onChange: (sort: PickerSort) => void;
}) {
  const { t } = useI18n();
  return (
    <label className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border border-hairline bg-wash px-2 pl-2.5 transition-colors focus-within:border-line">
      <span className="text-[11px] font-medium tracking-wide text-faint uppercase">
        {t("Sort")}
      </span>
      <span className="relative inline-flex items-center">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as PickerSort)}
          aria-label={t("Sort repositories")}
          className="h-full cursor-pointer appearance-none bg-transparent pr-4 text-[12px] font-medium text-mist outline-none hover:text-paper"
        >
          {OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {t(opt.label)}
            </option>
          ))}
        </select>
        <CaretDown
          size={10}
          weight="bold"
          className="pointer-events-none absolute right-0 text-faint"
        />
      </span>
    </label>
  );
}
