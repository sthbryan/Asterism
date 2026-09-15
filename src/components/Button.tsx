import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "ghost" | "quiet";

type Size = "sm" | "md";

const styles: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:bg-accent-hover active:bg-accent-press disabled:opacity-40",
  ghost:
    "border border-line bg-wash text-paper hover:bg-fill disabled:text-faint disabled:opacity-50",
  quiet: "text-mist hover:bg-fill hover:text-paper disabled:opacity-40",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[12.5px]",
  md: "h-9 px-3 text-sm",
};

export function Button({
  variant = "ghost",
  size = "sm",
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
}) {
  return (
    <button
      className={`inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-md leading-none font-medium tracking-[-0.01em] transition-colors disabled:cursor-not-allowed ${styles[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
