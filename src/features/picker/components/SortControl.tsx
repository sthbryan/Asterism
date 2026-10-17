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
    <Select
      value={value}
      onValueChange={changeSort}
      ariaLabel={t("Sort repositories")}
      className="w-44 shrink-0"
      options={OPTIONS.map((option) => ({
        value: option.value,
        label: t(option.label),
      }))}
      size="sm"
    />
  );
}
