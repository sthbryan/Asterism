export interface OwnerEntry {
  name: string;
  count: number;
}

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
  return (
    <div className="inline-flex gap-0.5 rounded-lg border border-hairline bg-wash p-[3px]">
      <SegTab
        label="All"
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

function SegTab({
  label,
  count,
  active,
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[12px] leading-none font-medium transition-colors ${
        active
          ? "bg-overlay text-paper shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
          : "text-mist hover:text-paper"
      }`}
    >
      {label}
      <span className="font-mono text-[10.5px] text-faint tabular">
        {count}
      </span>
    </button>
  );
}
