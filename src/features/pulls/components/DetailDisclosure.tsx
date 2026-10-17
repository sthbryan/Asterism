import { CaretRightIcon } from "@phosphor-icons/react";
import { Badge } from "@zovaris/sephiro";
import { cn } from "cn";
import type { ReactNode } from "react";
import { When } from "react-if";

export function DetailDisclosure({
  title,
  count,
  open,
  onOpenChange,
  actionLabel,
  children,
}: {
  title: string;
  count?: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionLabel: string;
  children: ReactNode;
}) {
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-hover"
      >
        <CaretRightIcon
          size={12}
          className={cn(
            "shrink-0 text-faint transition-transform",
            open && "rotate-90",
          )}
        />
        <span className="text-[12.5px] font-medium">{title}</span>
        <When condition={count != null}>
          <Badge
            size="sm"
            variant="neutral"
            className="px-1.5 py-0.5 text-[10px]"
          >
            {count}
          </Badge>
        </When>
        <span className="ml-auto shrink-0 text-[11.5px] text-faint">
          {actionLabel}
        </span>
      </button>
      {open ? <div className="pb-1">{children}</div> : null}
    </div>
  );
}
