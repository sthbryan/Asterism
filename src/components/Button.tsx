import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "quiet";

const styles: Record<Variant, string> = {
  primary: "bg-accent text-white hover:bg-[#b9151c] disabled:opacity-40",
  ghost: "text-paper hover:bg-white/[0.06] disabled:text-mist",
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
      className={`inline-flex h-7 shrink-0 items-center justify-center gap-1.5 rounded px-2.5 text-[12px] leading-none font-medium tracking-[-0.01em] transition-colors disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
