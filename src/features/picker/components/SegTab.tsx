export function SegTab({
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
