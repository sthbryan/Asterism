import { useI18n } from "@/app/hooks";
import type { OwnerEntry } from "../utils/pickerData";
import { SegTab } from "./SegTab";

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
  return (
    <div className="inline-flex gap-0.5 rounded-lg border border-hairline bg-wash p-[3px]">
      <SegTab
        label={t("All")}
        count={total}
        active={active === null}
        onClick={() => onChange(null)}
      />
      {owners.map((owner) => (
        <SegTab
          key={owner.name}
          label={owner.name}
          count={owner.count}
          active={active === owner.name}
          onClick={() => onChange(owner.name)}
        />
      ))}
    </div>
  );
}
