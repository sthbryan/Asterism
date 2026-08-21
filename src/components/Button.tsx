import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "quiet";

const styles: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-hover active:bg-accent-press disabled:opacity-40",
  ghost:
    "border border-line bg-white/[0.02] text-paper hover:bg-white/[0.06] disabled:text-faint disabled:opacity-50",
  quiet: "text-mist hover:bg-white/[0.06] hover:text-paper disabled:opacity-40",
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
      className={`inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg px-3.5 text-[13px] leading-none font-medium tracking-[-0.01em] transition-colors disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
