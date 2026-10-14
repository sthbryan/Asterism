import { Select } from "@zovaris/sephiro";
import { useI18n } from "@/app/hooks";
import type { PickerSort } from "../hooks/usePicker";

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
  const changeSort = (sort: string) => {
    if (sort === "selected" || sort === "name" || sort === "stars") {
      onChange(sort);
    }
  };

  return (
    <div className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-hairline bg-wash pl-2.5 transition-colors focus-within:border-line">
      <label
        id="picker-sort-label"
        htmlFor="picker-sort"
        className="text-[11px] font-medium tracking-wide text-faint uppercase"
      >
        {t("Sort")}
      </label>
      <Select
        id="picker-sort"
        value={value}
        onValueChange={changeSort}
        ariaLabel={t("Sort repositories")}
        ariaLabelledBy="picker-sort-label"
        className="min-w-44"
        options={OPTIONS.map((option) => ({
          value: option.value,
          label: t(option.label),
        }))}
        size="sm"
      />
    </div>
  );
}
