import { type ReactNode, useEffect, useId, useRef, useState } from "react";

type SelectOption = {
  value: string;
  label: ReactNode;
};

type SelectProps = {
  id?: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  className?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  disabled?: boolean;
};

export function Select({
  id,
  value,
  options,
  onChange,
  className = "",
  ariaLabel,
  ariaLabelledBy,
  disabled = false,
}: SelectProps) {
  const generatedId = useId();
  const triggerId = id ?? `select-${generatedId}`;
  const listboxId = `${triggerId}-options`;
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const selectedIndex = Math.max(
    options.findIndex((option) => option.value === value),
    0,
  );
  const [activeIndex, setActiveIndex] = useState(selectedIndex);
  const selectedOption = options[selectedIndex];

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) setActiveIndex(selectedIndex);
  }, [open, selectedIndex]);

  const choose = (option: SelectOption) => {
    onChange(option.value);
    setOpen(false);
  };

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        id={triggerId}
        type="button"
        className="flex h-9 w-full items-center justify-between gap-3 rounded-md border border-line bg-wash px-3 text-left text-sm text-paper outline-none transition-colors hover:bg-fill focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label={ariaLabel}
        aria-labelledby={ariaLabelledBy}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        disabled={disabled}
        onClick={() => {
          setActiveIndex(selectedIndex);
          setOpen((current) => !current);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            setOpen(false);
            return;
          }
          if (event.key === "ArrowDown" || event.key === "ArrowUp") {
            event.preventDefault();
            const direction = event.key === "ArrowDown" ? 1 : -1;
            setOpen(true);
            setActiveIndex(
              (activeIndex + direction + options.length) % options.length,
            );
            return;
          }
          if (event.key === "Home" || event.key === "End") {
            event.preventDefault();
            setOpen(true);
            setActiveIndex(event.key === "Home" ? 0 : options.length - 1);
            return;
          }
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (open) choose(options[activeIndex]);
            else setOpen(true);
          }
        }}
      >
        <span className="truncate">{selectedOption?.label}</span>
        <span
          aria-hidden="true"
          className={`h-2 w-2 shrink-0 rotate-45 border-r-2 border-b-2 border-mist transition-transform ${open ? "-translate-y-px rotate-[225deg]" : "-translate-y-0.5"}`}
        />
      </button>
      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-labelledby={ariaLabelledBy}
          className="absolute z-30 mt-1 max-h-60 w-full overflow-auto rounded-md border border-line bg-night p-1 shadow-dock-sm"
        >
          {options.map((option, index) => (
            <button
              key={option.value}
              id={`${listboxId}-${index}`}
              type="button"
              role="option"
              aria-selected={index === selectedIndex}
              className={`flex w-full items-center justify-between rounded px-2.5 py-2 text-left text-[13px] transition-colors ${index === activeIndex ? "bg-fill text-paper" : "text-mist hover:bg-wash hover:text-paper"}`}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(option)}
            >
              <span className="truncate">{option.label}</span>
              {index === selectedIndex && (
                <span
                  aria-hidden="true"
                  className="ml-3 h-2 w-3 rotate-[-45deg] border-b-2 border-l-2 border-accent"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
