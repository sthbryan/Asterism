import type { ReactNode } from "react";
import { Mark } from "./Mark";

export function Chrome({
  login,
  trailing,
  children,
}: {
  login?: string | null;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col bg-void text-paper">
      <header
        data-tauri-drag-region
        className="flex h-14 shrink-0 items-center gap-3 border-b border-line/80 pr-4 pl-[78px]"
      >
        <div className="flex items-center gap-2 text-star" data-tauri-drag-region>
          <Mark className="h-4 w-4" />
          <span className="text-[15px] font-semibold tracking-[-0.03em] text-paper">
            Asterism
          </span>
        </div>
        <div className="flex-1" data-tauri-drag-region />
        {login ? (
          <span className="font-mono text-[11px] text-mist">{login}</span>
        ) : null}
        {trailing}
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}
