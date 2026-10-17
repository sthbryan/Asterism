import { type ComponentType, lazy } from "react";

export type NavId = "overview" | "repos" | "pulls" | "create" | "settings";

export type AppRoute = {
  path: string;
  component: ComponentType;
  nav: NavId;
};

const ListView = lazy(() =>
  import("@/features/list").then((module) => ({ default: module.ListView })),
);
const PickerView = lazy(() =>
  import("@/features/picker").then((module) => ({
    default: module.PickerView,
  })),
);
const PullsView = lazy(() =>
  import("@/features/pulls").then((module) => ({ default: module.PullsView })),
);
const PullDetailView = lazy(() =>
  import("@/features/pulls").then((module) => ({
    default: module.PullDetailView,
  })),
);
const DetailView = lazy(() =>
  import("@/features/detail").then((module) => ({
    default: module.DetailView,
  })),
);
const CreateView = lazy(() =>
  import("@/features/create").then((module) => ({
    default: module.CreateView,
  })),
);
const SettingsView = lazy(() =>
  import("@/features/settings").then((module) => ({
    default: module.SettingsView,
  })),
);
const SetupView = lazy(() =>
  import("@/features/setup").then((module) => ({ default: module.SetupView })),
);

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
