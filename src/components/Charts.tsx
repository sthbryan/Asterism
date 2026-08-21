import { fmtCompact } from "../lib/format";

export function BarChart({
  items,
}: {
  items: { label: string; value: number; color?: string }[];
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <ul>
      {items.map((item, index) => {
        const pct = (item.value / max) * 100;
        const name = item.label.split("/")[1] ?? item.label;
        const top = index === 0 && item.value > 0;
        return (
          <li
            key={item.label}
            className="grid grid-cols-[minmax(0,140px)_1fr_56px] items-center gap-3 border-b border-hairline py-2 first:pt-0 last:border-b-0 last:pb-0"
          >
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ background: item.color ?? "#6f6f6f" }}
              />
              <span className="truncate text-[12.5px] font-medium">{name}</span>
            </span>
            <span className="block h-1.5 overflow-hidden rounded-full bg-raised">
              <span
                className={`block h-full rounded-full transition-[width] duration-500 ${
                  top ? "bg-gradient-to-r from-accent to-accent-hover" : "bg-[#707070]"
                }`}
                style={{ width: `${Math.max(pct, item.value > 0 ? 3 : 0)}%` }}
              />
            </span>
            <span
              className={`text-right font-mono text-[11.5px] tabular ${
                top ? "font-semibold text-paper" : "text-mist"
              }`}
            >
              {fmtCompact(item.value)}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
