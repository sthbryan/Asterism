import { ChartBar, FolderSimple, GearSix, Plus } from "@phosphor-icons/react";
import type { ReactNode } from "react";
import { useI18n } from "@/app/hooks";
import { dragWindow } from "@/lib/drag";

import { Mark } from "./Mark";

export type NavId = "overview" | "repos" | "create" | "settings";

function initials(login: string | null | undefined) {
  if (!login) return "··";
  const clean = login.replace(/[^a-zA-Z0-9]/g, "");
  return (clean.slice(0, 2) || login.slice(0, 2)).toUpperCase();
}

export function Chrome({
  login,
  online,
  nav,
  onNav,
  title,
  trackedCount,
  trailing,
  children,
}: {
  login?: string | null;
  online: boolean;
  nav: NavId;
  onNav: (id: NavId) => void;
  title: ReactNode;
  trackedCount?: number;
  trailing?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useI18n();
  return (
    <div className="flex h-full min-h-0 gap-3 bg-transparent p-3 text-paper">
      <aside className="relative flex w-[212px] shrink-0 flex-col overflow-hidden rounded-2xl border border-hairline bg-night pt-12 shadow-md">
        {/* biome-ignore lint/a11y/noStaticElementInteractions: Tauri window-drag region, not an app control; a role would mislead assistive tech. */}
        <div
          className="absolute inset-x-0 top-0 h-12"
          data-tauri-drag-region
          onMouseDown={dragWindow}
        />
        {/* biome-ignore lint/a11y/noStaticElementInteractions: Tauri window-drag region, not an app control; a role would mislead assistive tech. */}
        <div
          className="flex h-12 shrink-0 items-center gap-2.5 px-4"
          data-tauri-drag-region
          onMouseDown={dragWindow}
        >
          <span className="grid h-[26px] w-[26px] place-items-center rounded-md bg-gradient-to-br from-accent-hover to-accent text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)]">
            <Mark className="h-3.5 w-3.5" />
          </span>
          <span className="text-[14px] font-semibold tracking-[-0.01em]">
            Asterism
          </span>
        </div>
        <nav className="mt-1 flex flex-col gap-0.5 px-3">
          <div className="px-2.5 pt-2 pb-1 font-mono text-[10px] uppercase tracking-[0.09em] text-faint">
            {t("Panel")}
          </div>
          <NavButton
            active={nav === "overview"}
            icon={<ChartBar size={16} />}
            label={t("Overview")}
            onClick={() => onNav("overview")}
          />
          <NavButton
            active={nav === "repos"}
            icon={<FolderSimple size={16} />}
            label={t("Repositories")}
            onClick={() => onNav("repos")}
            badge={trackedCount}
          />
          <NavButton
            active={nav === "create"}
            icon={<Plus size={16} />}
            label={t("Create repository")}
            onClick={() => onNav("create")}
          />
        </nav>
        {/* biome-ignore lint/a11y/noStaticElementInteractions: Tauri window-drag region, not an app control; a role would mislead assistive tech. */}
        <div
          className="flex-1"
          data-tauri-drag-region
          onMouseDown={dragWindow}
        />
        <div className="px-3 pb-2">
          <NavButton
            active={nav === "settings"}
            icon={<GearSix size={16} />}
            label={t("settings.title")}
            onClick={() => onNav("settings")}
          />
        </div>
        {login ? (
          <div className="m-2.5 flex items-center gap-2 rounded-lg border border-hairline p-2">
            <span className="relative grid h-7 w-7 shrink-0 place-items-center rounded-full bg-fill font-mono text-[10px] font-semibold">
              {initials(login)}
              <span
                className={`ring-night absolute right-0 bottom-0 h-2 w-2 rounded-full ${online ? "bg-ok" : "bg-faint"} ring-2`}
              />
            </span>
            <div className="min-w-0">
              <div className="truncate text-[12px] leading-tight font-semibold">
                {login}
              </div>
              <div className="text-[10.5px] leading-tight text-faint">
                {t(online ? "offline.connected" : "offline.badge")}
              </div>
            </div>
          </div>
        ) : null}
      </aside>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-hairline bg-void shadow-md">
        {/* biome-ignore lint/a11y/noStaticElementInteractions: Tauri window-drag region, not an app control; a role would mislead assistive tech. */}
        <header
          data-tauri-drag-region
          onMouseDown={dragWindow}
          className="flex h-12 shrink-0 items-center gap-3 border-b border-hairline px-6"
        >
          <div className="min-w-0 truncate">{title}</div>
          <div className="flex-1" />
          {trailing ? (
            <div className="flex shrink-0 items-center gap-2.5" data-no-drag>
              {trailing}
            </div>
          ) : null}
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
      aria-current={active ? "page" : undefined}
      className={`relative flex h-8 w-full items-center gap-2 overflow-hidden rounded-md px-2.5 text-left text-[13px] font-medium transition-colors ${
        active
          ? "bg-accent/10 text-paper"
          : "text-mist hover:bg-hover hover:text-paper"
      }`}
    >
      <span
        className={`grid w-4 place-items-center ${active ? "text-accent-soft" : ""}`}
      >
        {icon}
      </span>
      <span className="truncate">{label}</span>
      {badge != null ? (
        <span
          className={`ml-auto rounded-full px-1.5 py-0.5 font-mono text-[10.5px] leading-none ${
            active ? "bg-accent/15 text-accent-soft" : "bg-fill text-mist"
          }`}
        >
          {badge}
        </span>
      ) : null}
    </button>
  );
}
