import { cn } from "cn";

export type BarListItem = {
  label: string;
  value: number;
  color?: string;
};

const ROW =
  "grid w-full grid-cols-[minmax(0,140px)_minmax(24px,1fr)_56px] items-center gap-3 py-2 text-left";

/**
 * Horizontal ranked bars with optional row actions.
 *
 * Sephiro 0.11.0 no longer ships BarList, so Asterism owns this primitive and
 * renders it with the app tokens that mirror Sephiro's.
 */
export function BarList({
  items,
  label,
  emptyText,
  formatValue = String,
  displayLabel,
  onSelect,
  className,
}: {
  items: readonly BarListItem[];
  label: string;
  emptyText?: string;
  formatValue?: (value: number) => string;
  displayLabel?: (label: string, index: number) => string;
  onSelect?: (item: BarListItem, index: number) => void;
  className?: string;
}) {
  if (items.length === 0) {
    return emptyText ? (
      <p className="py-3 text-center text-[12px] text-mist">{emptyText}</p>
    ) : null;
  }

  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <ul
      aria-label={label}
      className={cn("m-0 list-none p-0 tabular", className)}
    >
      {items.map((item, index) => {
        const top = index === 0;
        const name = displayLabel
          ? displayLabel(item.label, index)
          : item.label;
        const cells = (
          <>
            <span className="flex min-w-0 items-center gap-1.5">
              {item.color ? (
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: item.color }}
                />
              ) : null}
              <span className="truncate text-[12px] font-medium">{name}</span>
            </span>
            <span className="block h-1.5 overflow-hidden rounded-full bg-raised">
              <span
                className={cn(
                  "block h-full rounded-full transition-[width] duration-300",
                  top ? "bg-accent" : "bg-mist",
                )}
                style={{
                  width: `${Math.max((item.value / max) * 100, 2)}%`,
                  background: item.color,
                }}
              />
            </span>
            <span
              className={cn(
                "text-right font-mono text-[11px] tabular",
                top ? "font-semibold text-paper" : "text-mist",
              )}
            >
              {formatValue(item.value)}
            </span>
          </>
        );
        return (
          <li
            key={`${item.label}:${index}`}
            className="border-b border-hairline last:border-b-0"
          >
            {onSelect ? (
              <button
                type="button"
                className={cn(
                  ROW,
                  "rounded-sm transition-colors hover:bg-hover focus-visible:outline-2 focus-visible:outline-accent",
                )}
                onClick={() => onSelect(item, index)}
              >
                {cells}
              </button>
            ) : (
              <div className={ROW}>{cells}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
