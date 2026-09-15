import type { ComponentType } from "react";
import {
  CreateView,
  DetailView,
  ListView,
  PickerView,
  SettingsView,
  SetupView,
} from "@/features";
import { PullDetailView, PullsView } from "@/features/pulls";

export type NavId = "overview" | "repos" | "pulls" | "create" | "settings";

export type AppRoute = {
  path: string;
  component: ComponentType;
  nav: NavId;
};

export const ROUTES: AppRoute[] = [
  { path: "/", component: ListView, nav: "overview" },
  { path: "/repos", component: PickerView, nav: "repos" },
  { path: "/pulls", component: PullsView, nav: "pulls" },
  { path: "/pull/:repo/:number", component: PullDetailView, nav: "pulls" },
  { path: "/repo/:fullName", component: DetailView, nav: "overview" },
  { path: "/create", component: CreateView, nav: "create" },
  { path: "/settings", component: SettingsView, nav: "settings" },
  { path: "/setup", component: SetupView, nav: "overview" },
];

export function getNavForPath(path: string): NavId {
  if (path.startsWith("/settings")) return "settings";
  if (path.startsWith("/create")) return "create";
  if (path.startsWith("/repos")) return "repos";
  if (path.startsWith("/pull")) return "pulls";
  return "overview";
}

export function detailPath(fullName: string): string {
  return `/repo/${encodeURIComponent(fullName)}`;
}

export function decodeDetailParam(param: string | undefined): string {
  try {
    return decodeURIComponent(param ?? "");
  } catch {
    return param ?? "";
  }
}
