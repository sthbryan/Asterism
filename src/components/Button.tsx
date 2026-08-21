import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "quiet";

const styles: Record<Variant, string> = {
  primary:
    "bg-accent text-white shadow-[0_8px_18px_rgba(124,111,255,0.32)] hover:bg-accent-soft disabled:bg-accent/40 disabled:shadow-none",
  ghost:
    "border border-white/10 bg-white/[0.03] text-paper hover:bg-white/[0.07] disabled:text-mist",
  quiet: "text-mist hover:bg-white/[0.06] hover:text-paper disabled:text-mist/50",
};

export function Button({
  variant = "ghost",
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  children: ReactNode;
}) {
  return (
    <button
      className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium tracking-[-0.01em] transition-colors disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
