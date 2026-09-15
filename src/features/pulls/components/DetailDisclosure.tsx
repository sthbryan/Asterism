import { Case, Default, Switch, When } from "react-if";
import { Button } from "@/components/Button";

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
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="text-[13px] font-semibold">{title}</span>
      <When condition={count != null}>
        <span className="rounded-full bg-fill px-1.5 py-0.5 font-mono text-[10px] text-mist">
          {count}
        </span>
      </When>
      <Button className="ml-auto" variant="quiet" onClick={onClick}>
        <Switch>
          <Case condition={open}>⌃</Case>
          <Default>⌄</Default>
        </Switch>{" "}
        {actionLabel}
      </Button>
    </div>
  );
}
