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
      className={`relative h-[22px] w-[38px] shrink-0 rounded-full transition-colors ${
        on ? "bg-star" : "bg-line"
      }`}
    >
      <span
        className={`absolute top-[2px] left-[2px] h-[18px] w-[18px] rounded-full bg-paper shadow-sm transition-transform ${
          on ? "translate-x-[16px] bg-void" : ""
        }`}
      />
    </button>
  );
}
