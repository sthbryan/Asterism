import { fmtCompact } from "../lib/format";

export function BarChart({
  items,
  onSelect,
}: {
  items: { label: string; value: number; color?: string }[];
  onSelect?: (label: string) => void;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);
  return (
    <ul>
      {items.map((item, index) => {
        const pct = (item.value / max) * 100;
        const name = item.label.split("/")[1] ?? item.label;
        const top = index === 0 && item.value > 0;
        const rowClass = `grid w-full grid-cols-[minmax(0,140px)_1fr_56px] items-center gap-3 py-2 text-left ${
          onSelect ? "rounded-md transition-colors hover:bg-white/[0.03]" : ""
        }`;
        const body = (
          <>
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
          </>
        );
        return (
          <li key={item.label} className="border-b border-hairline first:pt-0 last:border-b-0 last:pb-0">
            {onSelect ? (
              <button type="button" onClick={() => onSelect(item.label)} className={rowClass}>
                {body}
              </button>
            ) : (
              <div className={rowClass}>{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
