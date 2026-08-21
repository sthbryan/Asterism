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
      <aside className="flex w-[236px] shrink-0 flex-col border-r border-hairline bg-night pt-12">
        <div className="flex h-14 items-center gap-3 px-5" data-tauri-drag-region>
          <span className="grid h-[30px] w-[30px] place-items-center rounded-lg bg-gradient-to-br from-accent-hover to-accent text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
            <Mark className="h-4 w-4" />
          </span>
          <span className="text-[15px] font-semibold tracking-[-0.01em]">Asterism</span>
        </div>
        <nav className="mt-1 flex flex-col gap-0.5 px-3">
          <div className="px-2.5 pt-3 pb-1.5 font-mono text-[10.5px] uppercase tracking-[0.09em] text-faint">
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
          <div className="m-3 flex items-center gap-2.5 rounded-xl border border-hairline p-2.5">
            <span className="relative grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-white/[0.07] font-mono text-[11px] font-semibold">
              {initials(login)}
              <span className="ring-night absolute right-0 bottom-0 h-2 w-2 rounded-full bg-ok ring-2" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-[13px] leading-tight font-semibold">{login}</div>
              <div className="text-[11.5px] leading-tight text-faint">GitHub · synced</div>
            </div>
          </div>
        ) : null}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          data-tauri-drag-region
          className="flex h-14 shrink-0 items-center gap-3 border-b border-hairline px-7"
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
      className={`relative flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-left text-[13.5px] font-medium transition-colors ${
        active ? "bg-white/[0.06] text-paper" : "text-mist hover:bg-white/[0.03] hover:text-paper"
      }`}
    >
      {active ? (
        <span className="absolute top-1.5 bottom-1.5 -left-3 w-[3px] rounded-r-full bg-accent-soft" />
      ) : null}
      <span className={`grid w-4 place-items-center ${active ? "text-accent-soft" : ""}`}>
        {icon}
      </span>
      <span className="truncate">{label}</span>
      {badge != null ? (
        <span
          className={`ml-auto rounded-full px-2 py-0.5 font-mono text-[11px] leading-none ${
            active ? "bg-accent/15 text-accent-soft" : "bg-white/[0.07] text-mist"
          }`}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}
