import {
  ChartBarIcon,
  FolderSimpleIcon,
  GitPullRequestIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { Avatar, SegmentedControl } from "@zovaris/sephiro";
import type { ReactNode } from "react";
import { useI18n } from "@/app/hooks";
import { dragWindow } from "@/lib/drag";

import { Mark } from "./Mark";

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
  return (
    <div className="flex h-full min-h-0 flex-col bg-transparent text-paper">
      {/* One rail owns the window controls, the navigation and the account. */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Native window drag region. */}
      <header
        data-tauri-drag-region
        onMouseDown={dragWindow}
        className="app-rail"
      >
        <div className="app-brand">
          <span className="app-mark">
            <Mark className="h-3 w-3" />
          </span>
          <span className="truncate text-[13.5px] font-semibold tracking-[-0.01em]">
            Asterism
          </span>
        </div>

        <SegmentedControl
          ariaLabel={t("Panel")}
          className="app-nav"
          size="sm"
          value={nav}
          onValueChange={(value) => onNav(value as NavId)}
          options={[
            {
              value: "overview",
              label: t("Overview"),
              icon: <ChartBarIcon size={14} />,
            },
            {
              value: "repos",
              label: (
                <>
                  {t("Repositories")}
                  {trackedCount != null ? (
                    <span className="app-nav-count">{trackedCount}</span>
                  ) : null}
                </>
              ),
              icon: <FolderSimpleIcon size={14} />,
            },
            {
              value: "pulls",
              label: t("pulls.title"),
              icon: <GitPullRequestIcon size={14} />,
            },
            {
              value: "create",
              label: t("Create repository"),
              icon: <PlusIcon size={14} />,
            },
          ]}
        />

        <div className="app-rail-end" data-no-drag>
          {/* The account is the only way into settings, so there is no second gear. */}
          {login ? (
            <button
              type="button"
              className="app-account"
              onClick={() => onNav("settings")}
              title={t("settings.title")}
              aria-label={t("settings.title")}
              aria-current={nav === "settings" ? "page" : undefined}
            >
              <Avatar name={login} size="sm" />
              <span className="truncate">{login}</span>
            </button>
          ) : null}
        </div>
      </header>

      {/* The page bar belongs to the content plane, not to the window chrome. */}
      {/* biome-ignore lint/a11y/noStaticElementInteractions: Native window drag region. */}
      <div
        data-tauri-drag-region
        onMouseDown={dragWindow}
        className="app-pagebar"
      >
        <div className="min-w-0 truncate">{title}</div>
        <div className="flex-1" />
        {trailing ? (
          <div className="flex shrink-0 items-center gap-2.5" data-no-drag>
            {trailing}
          </div>
        ) : null}
      </div>

      <main className="app-plane min-h-0 flex-1">{children}</main>
    </div>
  );
}
