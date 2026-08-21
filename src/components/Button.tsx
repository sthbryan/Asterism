import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "quiet";

const styles: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-soft disabled:bg-accent/40",
  ghost:
    "border border-line bg-transparent text-paper hover:bg-white/[0.04] disabled:text-mist",
  quiet: "text-mist hover:bg-white/[0.04] hover:text-paper disabled:text-mist/50",
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
      className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium tracking-[-0.01em] transition-colors disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
