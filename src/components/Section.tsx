import { cn } from "cn";
import type { ReactNode } from "react";

/** A band on the content plane: a hairline, a mono label and its data. */
export function Section({
  label,
  meta,
  icon,
  tone = "muted",
  trailing,
  labelAs = "span",
  children,
  className,
}: {
  label?: ReactNode;
  meta?: ReactNode;
  icon?: ReactNode;
  tone?: "muted" | "accent";
  /** Actions that belong to the section itself, right-aligned in the head. */
  trailing?: ReactNode;
  /** Settings read as a document outline, so their labels are real headings. */
  labelAs?: "span" | "h2";
  children: ReactNode;
  className?: string;
}) {
  const Label = labelAs;
  return (
    <section className={cn("app-section", className)}>
      {label || meta || icon || trailing ? (
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
          {label ? (
            <Label className="kpi-label text-faint">{label}</Label>
          ) : null}
          {meta || trailing ? (
            <span className="ml-auto flex shrink-0 items-center gap-2">
              {meta ? (
                <span className="font-mono text-[11.5px] text-faint tabular">
                  {meta}
                </span>
              ) : null}
              {trailing}
            </span>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}
