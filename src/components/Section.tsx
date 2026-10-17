import { cn } from "cn";
import type { ReactNode } from "react";

/** A band on the content plane: a hairline, a mono label and its data. */
export function Section({
  label,
  meta,
  icon,
  tone = "muted",
  children,
  className,
}: {
  label?: ReactNode;
  meta?: ReactNode;
  icon?: ReactNode;
  tone?: "muted" | "accent";
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("app-section", className)}>
      {label || meta || icon ? (
        <div className="app-section-head">
          {icon ? (
            <span
              className={cn(
                "app-chip",
                tone === "accent" && "app-chip--accent",
              )}
            >
              {icon}
            </span>
          ) : null}
          {label ? <span className="kpi-label text-faint">{label}</span> : null}
          {meta ? (
            <span className="ml-auto font-mono text-[11.5px] text-faint tabular">
              {meta}
            </span>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
