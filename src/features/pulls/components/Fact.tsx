import { Surface } from "@zovaris/sephiro";
export function Fact({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <Surface padding="sm" className=" border border-hairline">
      <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.08em] text-faint">
        {icon}
        {label}
      </div>
      <div className="mt-2 truncate text-[12.5px] font-semibold">{value}</div>
    </Surface>
  );
}
