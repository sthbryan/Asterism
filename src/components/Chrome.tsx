import type { ReactNode } from "react";
import { ChartBar, FolderSimple } from "@phosphor-icons/react";
import { Mark } from "./Mark";

export type NavId = "overview" | "repos";

function initials(login: string | null | undefined) {
  if (!login) return "··";
  const clean = login.replace(/[^a-zA-Z0-9]/g, "");
  return (clean.slice(0, 2) || login.slice(0, 2)).toUpperCase();
}

export function Chrome({
  login,
  nav,
  onNav,
  title,
  trackedCount,
  trailing,
  children,
}: {
  login?: string | null;
  nav: NavId;
  onNav: (id: NavId) => void;
  title: ReactNode;
  trackedCount?: number;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 bg-void text-paper">
      <aside className="flex w-[212px] shrink-0 flex-col border-r border-hairline bg-night pt-12">
        <div className="flex h-12 items-center gap-2.5 px-4" data-tauri-drag-region>
          <span className="grid h-[26px] w-[26px] place-items-center rounded-md bg-gradient-to-br from-accent-hover to-accent text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
            <Mark className="h-3.5 w-3.5" />
          </span>
          <span className="text-[14px] font-semibold tracking-[-0.01em]">Asterism</span>
        </div>
        <nav className="mt-1 flex flex-col gap-0.5 px-3">
          <div className="px-2.5 pt-2 pb-1 font-mono text-[10px] uppercase tracking-[0.09em] text-faint">
            Panel
          </div>
          <NavButton
            active={nav === "overview"}
            icon={<ChartBar size={16} />}
            label="Overview"
            onClick={() => onNav("overview")}
          />
          <NavButton
            active={nav === "repos"}
            icon={<FolderSimple size={16} />}
            label="Repositories"
            onClick={() => onNav("repos")}
            badge={trackedCount}
          />
        </nav>
        <div className="flex-1" data-tauri-drag-region />
        {login ? (
          <div className="m-2.5 flex items-center gap-2 rounded-lg border border-hairline p-2">
            <span className="relative grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/[0.07] font-mono text-[10px] font-semibold">
              {initials(login)}
              <span className="ring-night absolute right-0 bottom-0 h-2 w-2 rounded-full bg-ok ring-2" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-[12px] leading-tight font-semibold">{login}</div>
              <div className="text-[10.5px] leading-tight text-faint">GitHub · synced</div>
            </div>
          </div>
        ) : null}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          data-tauri-drag-region
          className="flex h-12 shrink-0 items-center gap-3 border-b border-hairline px-6"
        >
          <div className="min-w-0 truncate">{title}</div>
          <div className="flex-1" data-tauri-drag-region />
          {trailing ? <div className="flex shrink-0 items-center gap-2.5">{trailing}</div> : null}
        </header>
        <div className="min-h-0 flex-1">{children}</div>
      </div>
    </div>
  );
}

function NavButton({
  active,
  icon,
  label,
  badge,
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  badge?: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`relative flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-left text-[13px] font-medium transition-colors ${
        active ? "bg-white/[0.06] text-paper" : "text-mist hover:bg-white/[0.03] hover:text-paper"
      }`}
    >
      {active ? (
        <span className="absolute top-1 bottom-1 -left-3 w-[3px] rounded-r-full bg-accent-soft" />
      ) : null}
      <span className={`grid w-4 place-items-center ${active ? "text-accent-soft" : ""}`}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
      {badge != null ? (
        <span
          className={`ml-auto rounded-full px-1.5 py-0.5 font-mono text-[10.5px] leading-none ${
            active ? "bg-accent/15 text-accent-soft" : "bg-white/[0.07] text-mist"
          }`}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}
