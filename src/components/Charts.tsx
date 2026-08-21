import { fmtCompact } from "../lib/format";

export function BarChart({
  items,
}: {
  items: { label: string; value: number }[];
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <ul className="space-y-2.5">
      {items.map((item) => {
        const pct = (item.value / max) * 100;
        const name = item.label.split("/")[1] ?? item.label;
        return (
          <li key={item.label} className="grid grid-cols-[112px_1fr_56px] items-center gap-3">
            <span className="truncate text-[12px] text-mist">{name}</span>
            <div className="h-1.5 overflow-hidden rounded-sm bg-line">
              <div
                className="h-full bg-accent"
                style={{ width: `${Math.max(pct, item.value > 0 ? 2 : 0)}%` }}
              />
            </div>
            <span className="text-right text-[12px] tabular">{fmtCompact(item.value)}</span>
          </li>
        );
      })}
    </ul>
  );
}
