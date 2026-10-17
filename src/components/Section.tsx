import { cn } from "cn";
import type { ReactNode } from "react";

/** A band on the content plane: a hairline, a mono label and its data. */
export function Section({
  label,
  meta,
  children,
  className,
}: {
  label?: ReactNode;
  meta?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("app-section", className)}>
      {label || meta ? (
        <div className="app-section-head">
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
