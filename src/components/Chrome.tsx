import type { ReactNode } from "react";
import { ChartBar, FolderSimple, User } from "@phosphor-icons/react";
import { Mark } from "./Mark";

export type NavId = "overview" | "repos";

export function Chrome({
  login,
  nav,
  onNav,
  title,
  trailing,
  children,
}: {
  login?: string | null;
  nav: NavId;
  onNav: (id: NavId) => void;
  title: string;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 bg-void text-paper">
      <aside className="flex w-[232px] shrink-0 flex-col border-r border-white/5 bg-night pt-12">
        <div className="flex items-center gap-3 px-5 py-3" data-tauri-drag-region>
          <span className="grid h-9 w-9 place-items-center rounded-2xl bg-accent text-white shadow-[0_8px_18px_rgba(124,111,255,0.35)]">
            <Mark className="h-4 w-4" />
          </span>
          <span className="text-[15px] font-semibold tracking-[-0.03em]">Asterism</span>
        </div>
        <nav className="mt-4 flex flex-col gap-1 px-3">
          <NavButton
            active={nav === "overview"}
            icon={<ChartBar size={16} weight={nav === "overview" ? "fill" : "regular"} />}
            label="Overview"
            onClick={() => onNav("overview")}
          />
          <NavButton
            active={nav === "repos"}
            icon={<FolderSimple size={16} weight={nav === "repos" ? "fill" : "regular"} />}
            label="Repos"
            onClick={() => onNav("repos")}
          />
        </nav>
        <div className="flex-1" data-tauri-drag-region />
        {login ? (
          <div className="m-3 flex items-center gap-3 rounded-2xl bg-white/[0.04] px-3 py-2.5">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-accent/20 text-accent">
              <User size={14} weight="fill" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-[12px] font-medium">{login}</div>
              <div className="text-[11px] text-mist">GitHub</div>
            </div>
          </div>
        ) : null}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          data-tauri-drag-region
          className="flex h-14 shrink-0 items-center gap-3 px-6"
        >
          <h1 className="text-[17px] font-semibold tracking-[-0.03em]">{title}</h1>
          <div className="flex-1" data-tauri-drag-region />
          {trailing}
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
  onClick,
}: {
  active: boolean;
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-3 rounded-2xl px-3 py-2.5 text-left text-[13px] font-medium transition-colors ${
        active ? "bg-accent/18 text-paper" : "text-mist hover:bg-white/[0.04] hover:text-paper"
      }`}
    >
      <span className={active ? "text-accent-soft" : ""}>{icon}</span>
      {label}
    </button>
  );
}
