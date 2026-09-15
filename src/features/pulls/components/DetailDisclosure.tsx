import { CaretDownIcon } from "@phosphor-icons/react";
import { cn } from "cn";
import { When } from "react-if";

export function DetailDisclosure({
  title,
  count,
  open,
  onClick,
  actionLabel,
}: {
  title: string;
  count?: number;
  open: boolean;
  onClick: () => void;
  actionLabel: string;
}) {
  return (
    <button
      type="button"
      className="flex h-9 w-full items-center justify-between gap-3 rounded-md border border-line bg-wash px-3 text-left text-sm text-paper outline-none transition-colors hover:bg-fill focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30"
      aria-expanded={open}
      onClick={onClick}
    >
      <span className="flex min-w-0 items-center gap-2">
        <span className="truncate">{actionLabel}</span>
        <When condition={count != null}>
          <span className="rounded-full bg-fill px-1.5 py-0.5 font-mono text-[10px] text-mist">
            {count}
          </span>
        </When>
        <span className="sr-only">{title}</span>
      </span>
      <CaretDownIcon
        aria-hidden
        className={cn(
          "size-3.5 shrink-0 transition-transform mt-1",
          open ? "-translate-y-px rotate-180" : "-translate-y-0.5",
        )}
      />
    </button>
  );
}
