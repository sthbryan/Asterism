import type { Renderable } from "@zovaris/sephiro";
import { Badge, Collapsible } from "@zovaris/sephiro";

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
  children: Renderable;
}) {
  return (
    <Collapsible
      className="[&_.sph-collapsible__trigger]:h-9 [&_.sph-collapsible__trigger]:justify-between [&_.sph-collapsible__trigger]:gap-3 [&_.sph-collapsible__trigger]:rounded-md [&_.sph-collapsible__trigger]:border [&_.sph-collapsible__trigger]:border-line [&_.sph-collapsible__trigger]:bg-wash [&_.sph-collapsible__trigger]:px-3 [&_.sph-collapsible__trigger]:text-sm [&_.sph-collapsible__trigger]:text-paper [&_.sph-collapsible__trigger]:hover:bg-fill [&_.sph-collapsible__trigger]:hover:text-paper [&_.sph-collapsible__inner]:p-0"
      open={open}
      onOpenChange={onOpenChange}
      trigger={
        <span className="flex min-w-0 items-center gap-2">
          <span className="truncate">{actionLabel}</span>
          {count != null && <Badge size="sm">{count}</Badge>}
          <span className="sr-only">{title}</span>
        </span>
      }
    >
      {open ? children : null}
    </Collapsible>
  );
}
