import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "quiet";

const styles: Record<Variant, string> = {
  primary:
    "border-accent bg-accent text-white hover:border-accent-soft hover:bg-accent-soft disabled:border-accent/40 disabled:bg-accent/40",
  ghost:
    "border-line bg-transparent text-paper hover:bg-white/[0.04] disabled:text-mist",
  quiet:
    "border-transparent text-mist hover:bg-white/[0.04] hover:text-paper disabled:text-mist/50",
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
      className={`inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-md border px-3 text-[13px] leading-none font-medium tracking-[-0.015em] transition-colors disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
