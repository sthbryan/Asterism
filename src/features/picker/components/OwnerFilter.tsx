import { SegmentedControl } from "@zovaris/sephiro";
import { useI18n } from "@/app/hooks";
import type { OwnerEntry } from "../utils/pickerData";

export function OwnerFilter({
  total,
  owners,
  active,
  onChange,
}: {
  total: number;
  owners: OwnerEntry[];
  active: string | null;
  onChange: (owner: string | null) => void;
}) {
  const { t } = useI18n();
  const options = [
    {
      value: "",
      label: (
        <>
          {t("All")}{" "}
          <span className="font-mono text-[10.5px] text-faint tabular">
            {total}
          </span>
        </>
      ),
    },
    ...owners.map((owner) => ({
      value: owner.name,
      label: (
        <>
          {owner.name}{" "}
          <span className="font-mono text-[10.5px] text-faint tabular">
            {owner.count}
          </span>
        </>
      ),
    })),
  ];

  return (
    <SegmentedControl
      options={options}
      ariaLabel={t("Owner")}
      value={active ?? ""}
      onValueChange={(value) => onChange(value || null)}
      size="sm"
    />
  );
}
