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
      <aside className="flex w-[212px] shrink-0 flex-col border-r border-line bg-night pt-12">
        <div className="flex items-center gap-2.5 px-4 py-3" data-tauri-drag-region>
          <span className="grid h-7 w-7 place-items-center rounded-md bg-accent text-white">
            <Mark className="h-3.5 w-3.5" />
          </span>
          <span className="text-[14px] font-semibold tracking-[-0.02em]">Asterism</span>
        </div>
        <nav className="mt-3 flex flex-col gap-0.5 px-2">
          <NavButton
            active={nav === "overview"}
            icon={<ChartBar size={15} />}
            label="Overview"
            onClick={() => onNav("overview")}
          />
          <NavButton
            active={nav === "repos"}
            icon={<FolderSimple size={15} />}
            label="Repos"
            onClick={() => onNav("repos")}
          />
        </nav>
        <div className="flex-1" data-tauri-drag-region />
        {login ? (
          <div className="m-3 flex items-center gap-2.5 px-2 py-2">
            <span className="grid h-7 w-7 place-items-center rounded-md border border-line text-mist">
              <User size={13} />
            </span>
            <div className="min-w-0">
              <div className="truncate text-[12px] font-medium">{login}</div>
              <div className="text-[11px] text-mist">GitHub</div>
            </div>
          </div>
        ) : null}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header data-tauri-drag-region className="flex h-12 shrink-0 items-center gap-3 px-5">
          <h1 className="text-[15px] font-semibold tracking-[-0.02em]">{title}</h1>
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
      className={`flex items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] ${
        active
          ? "bg-white/[0.05] text-paper"
          : "text-mist hover:bg-white/[0.03] hover:text-paper"
      }`}
    >
      <span className={active ? "text-accent" : ""}>{icon}</span>
      {label}
    </button>
  );
}
