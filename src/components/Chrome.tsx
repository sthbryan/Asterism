import {
  ChartBarIcon,
  FolderSimpleIcon,
  GearSixIcon,
  GitPullRequestIcon,
  PlusIcon,
} from "@phosphor-icons/react";
import { Avatar, Badge, Button, Sidebar } from "@zovaris/sephiro";
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
    <div className="flex h-full min-h-0 gap-3 bg-transparent p-2 text-paper">
      <Sidebar
        className="app-sidebar"
        ariaLabel={t("Panel")}
        value={nav}
        onSelect={(value) => onNav(value as NavId)}
        sections={[
          {
            title: t("Panel"),
            items: [
              {
                value: "overview",
                label: t("Overview"),
                icon: <ChartBarIcon size={16} />,
              },
              {
                value: "repos",
                label: t("Repositories"),
                icon: <FolderSimpleIcon size={16} />,
                badge:
                  trackedCount != null ? (
                    <Badge>{trackedCount}</Badge>
                  ) : undefined,
              },
              {
                value: "pulls",
                label: t("pulls.title"),
                icon: <GitPullRequestIcon size={16} />,
              },
              {
                value: "create",
                label: t("Create repository"),
                icon: <PlusIcon size={16} />,
              },
            ],
          },
        ]}
        header={
          <>
            {/* biome-ignore lint/a11y/noStaticElementInteractions: Native window drag region. */}
            <div
              className="absolute inset-x-0 top-0 h-12"
              data-tauri-drag-region
              onMouseDown={dragWindow}
            />
            {/* biome-ignore lint/a11y/noStaticElementInteractions: Native window drag region. */}
            <div
              className="flex h-12 shrink-0 items-center gap-2.5"
              data-tauri-drag-region
              onMouseDown={dragWindow}
            >
              <span className="grid h-[26px] w-[26px] place-items-center rounded-md bg-accent text-white">
                <Mark className="h-3.5 w-3.5" />
              </span>
              <span className="text-[14px] font-semibold tracking-[-0.01em]">
                Asterism
              </span>
            </div>
          </>
        }
        footer={
          <>
            {/* biome-ignore lint/a11y/noStaticElementInteractions: Native window drag region. */}
            <div
              className="min-h-4 flex-1"
              data-tauri-drag-region
              onMouseDown={dragWindow}
            />
            <Button
              size="sm"
              variant="quiet"
              aria-current={nav === "settings" ? "page" : undefined}
              onClick={() => onNav("settings")}
            >
              <GearSixIcon size={16} />
              {t("settings.title")}
            </Button>
            {login ? (
              <div className="mt-2 flex items-center gap-2 rounded-lg border border-hairline p-2">
                <Avatar name={login} size="sm" />
                <span className="min-w-0 truncate text-[12px] font-semibold">
                  {login}
                </span>
              </div>
            ) : null}
          </>
        }
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-hairline bg-void shadow-md">
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
