import {
  ChartBarIcon,
  FolderSimpleIcon,
  GearSixIcon,
  GitPullRequestIcon,
  PlusIcon,
  SidebarSimpleIcon,
} from "@phosphor-icons/react";
import { Avatar } from "@zovaris/sephiro";
import { type ReactNode, useState } from "react";
import { useI18n } from "@/app/hooks";
import { dragWindow, hasTrafficLights } from "@/lib/drag";
import { readRailCollapsed, saveRailCollapsed } from "@/lib/rail";

import { Mark } from "./Mark";

const trafficLights = hasTrafficLights();

export type NavId = "overview" | "repos" | "pulls" | "create" | "settings";

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
  const { t } = useI18n();
  const [collapsed, setCollapsed] = useState(readRailCollapsed);
  const items: {
    id: NavId;
    label: string;
    icon: ReactNode;
    count?: number;
  }[] = [
    { id: "overview", label: t("Overview"), icon: <ChartBarIcon size={15} /> },
    {
      id: "repos",
      label: t("Repositories"),
      icon: <FolderSimpleIcon size={15} />,
      count: trackedCount,
    },
    {
      id: "pulls",
      label: t("pulls.title"),
      icon: <GitPullRequestIcon size={15} />,
    },
    {
      id: "create",
      label: t("Create repository"),
      icon: <PlusIcon size={15} />,
    },
  ];
  const item = (entry: {
    id: NavId;
    label: string;
    icon: ReactNode;
    count?: number;
  }) => (
    <button
      key={entry.id}
      type="button"
      className="app-nav-item"
      aria-label={entry.label}
      aria-current={nav === entry.id ? "page" : undefined}
      title={collapsed ? entry.label : undefined}
      onClick={() => onNav(entry.id)}
    >
      <span className="app-nav-icon">{entry.icon}</span>
      <span className="app-nav-label min-w-0 flex-1 truncate">
        {entry.label}
      </span>
      {entry.count != null ? (
        <span className="app-nav-count">{entry.count}</span>
      ) : null}
    </button>
  );
  const toggleLabel = t(collapsed ? "Expand sidebar" : "Collapse sidebar");

  return (
    <div className="flex h-full min-h-0 flex-col text-paper">
      {/* The page bar spans the window, so the rail starts below it and the
          traffic lights never sit on top of the brand. */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Native window drag region. */}
      <div
        data-tauri-drag-region
        onMouseDown={dragWindow}
        className={trafficLights ? "app-pagebar is-native" : "app-pagebar"}
      >
        <button
          type="button"
          className="app-rail-toggle"
          aria-label={toggleLabel}
          aria-controls="app-rail"
          aria-expanded={!collapsed}
          title={toggleLabel}
          onClick={() => {
            setCollapsed((value) => {
              saveRailCollapsed(!value);
              return !value;
            });
          }}
        >
          <SidebarSimpleIcon size={15} mirrored={collapsed} />
        </button>
        <div className="min-w-0 truncate">{title}</div>
        <div className="flex-1" />
        {trailing ? (
          <div className="flex shrink-0 items-center gap-2.5" data-no-drag>
            {trailing}
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1">
        {/* One rail owns the brand, the navigation and the account. */}
        <aside
          id="app-rail"
          className="app-sidebar"
          data-collapsed={collapsed ? "true" : undefined}
          data-tauri-drag-region
          onMouseDown={dragWindow}
        >
          <div className="app-brand">
            <span className="app-mark">
              <Mark className="h-3 w-3" />
            </span>
            <span className="app-brand-name min-w-0 truncate text-[13.5px] font-semibold tracking-[-0.01em]">
              Asterism
            </span>
          </div>

          <nav aria-label={t("Panel")} className="app-nav">
            {items.map(item)}
          </nav>

          <div className="flex-1" />

          <div className="app-sidebar-foot">
            {item({
              id: "settings",
              label: t("settings.title"),
              icon: <GearSixIcon size={15} />,
            })}
            {login ? (
              <div className="app-account" title={login}>
                <Avatar
                  src={`https://github.com/${login}.png?size=64`}
                  name={login}
                  size="sm"
                />
                <span className="app-account-name truncate">{login}</span>
              </div>
            ) : null}
          </div>
        </aside>

        <main className="app-plane min-h-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
