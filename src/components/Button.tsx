import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "quiet";

const styles: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-hover active:bg-accent-press disabled:opacity-40",
  ghost:
    "border border-line bg-wash text-paper hover:bg-fill disabled:text-faint disabled:opacity-50",
  quiet: "text-mist hover:bg-fill hover:text-paper disabled:opacity-40",
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
      className={`inline-flex h-8 shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md px-3 text-[12.5px] leading-none font-medium tracking-[-0.01em] transition-colors disabled:cursor-not-allowed ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
