import { ArrowSquareOut } from "@phosphor-icons/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { hrefFromMaybeUrl } from "../../lib/format";

export function Flag({ children }: { children: string }) {
  return (
    <span className="shrink-0 rounded-md border border-line px-1.5 py-px font-mono text-[10px] tracking-wide uppercase text-mist">
      {children}
    </span>
  );
}

export function HomepageValue({ value }: { value: string | null }) {
  if (!value) return "—";
  const href = hrefFromMaybeUrl(value);
  if (!href) return value;
  return (
    <button
      type="button"
      title={href}
      onClick={() => {
        void openUrl(href);
      }}
      className="inline-flex max-w-full items-center gap-1 text-left text-accent-soft hover:underline"
    >
      <span className="truncate">{value}</span>
      <ArrowSquareOut size={11} className="shrink-0" />
    </button>
  );
}
