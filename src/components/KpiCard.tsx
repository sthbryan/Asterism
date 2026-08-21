import { fmtCompact } from "../lib/format";

export function KpiCard({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="min-w-0 px-5 py-4">
      <div className="text-[12px] text-mist">{label}</div>
      <div className="mt-2 text-[22px] leading-none font-semibold tracking-[-0.03em] tabular">
        {fmtCompact(value)}
      </div>
    </div>
  );
}
