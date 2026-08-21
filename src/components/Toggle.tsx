export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        on ? "bg-accent" : "bg-line"
      }`}
    >
      <span
        className={`absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full bg-paper shadow-sm transition-transform ${
          on ? "translate-x-[20px]" : ""
        }`}
      />
    </button>
  );
}
