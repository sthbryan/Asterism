import { MagnifyingGlassIcon } from "@phosphor-icons/react";
import { Input } from "@zovaris/sephiro";
import { cn } from "cn";

/**
 * One search field for the whole app: Sephiro's input owns the surface, border
 * and 32px height, so no screen can drift from another.
 */
export function SearchField({
  id,
  value,
  onChange,
  placeholder,
  ariaLabel,
  className,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("app-search relative", className)}>
      <MagnifyingGlassIcon
        size={13}
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-faint"
      />
      <Input
        id={id}
        size="sm"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={ariaLabel}
        autoComplete="off"
      />
    </div>
  );
}
