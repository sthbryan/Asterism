export function Fact({
  icon,
  label,
  value,
  hint,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string | null;
}) {
  return (
    <div className="min-w-0 p-4">
      <div className="flex items-center gap-1.5">
        <span className="shrink-0 text-faint">{icon}</span>
        <span className="kpi-label truncate text-faint">{label}</span>
      </div>
      <div className="mt-2 truncate text-[13px] font-semibold">{value}</div>
      {hint ? (
        <div className="mt-1 truncate text-[11.5px] text-mist">{hint}</div>
      ) : null}
    </div>
  );
}
