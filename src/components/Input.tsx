import type { InputHTMLAttributes } from "react";

type InputVariant = "field" | "compact";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  variant?: InputVariant;
  invalid?: boolean;
};

const styles: Record<InputVariant, string> = {
  field:
    "mt-2 h-9 w-full rounded-md border border-line bg-wash px-3 py-2 text-[13px] text-paper outline-none transition-colors placeholder:text-faint focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-50",
  compact:
    "h-full w-full bg-transparent text-[12.5px] leading-none text-paper outline-none placeholder:text-faint disabled:cursor-not-allowed disabled:opacity-50",
};

export function Input({
  variant = "field",
  invalid = false,
  className = "",
  ...props
}: InputProps) {
  return (
    <input
      {...props}
      aria-invalid={invalid || props["aria-invalid"]}
      className={`${styles[variant]} ${invalid ? "border-accent-soft" : ""} ${className}`}
    />
  );
}
