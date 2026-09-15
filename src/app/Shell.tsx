import { Redirect, Route, Switch, useLocation } from "wouter";
import { AppearanceProvider } from "@/components/Appearance";
import { Chrome, type NavId } from "@/components/Chrome";
import { HeaderProvider, useHeader } from "@/components/PageHeader";
import { useBoot } from "./hooks";
import { getNavForPath, ROUTES } from "./routes";
import { useStore } from "./store";
import { useTransitionNavigate } from "./useViewTransition";

export function Shell() {
  useBoot();
  const theme = useStore((s) => s.theme);
  const transparency = useStore((s) => s.transparency);

  return (
    <AppearanceProvider theme={theme} transparency={transparency}>
      <HeaderProvider>
        <AppLayout />
      </HeaderProvider>
    </AppearanceProvider>
  );
}

function AppLayout() {
  const [location] = useLocation();
  const navigate = useTransitionNavigate();
  const { header } = useHeader();
  const status = useStore((s) => s.status);
  const selectedNames = useStore((s) => s.selectedNames);
  const account = useStore((s) => s.account);
  const login = status?.login ?? account?.split("/").pop() ?? null;

  const nav = getNavForPath(location);

  const handleNav = (id: NavId) => {
    if (id === "settings") {
      navigate("/settings");
      return;
    }

    if (id === "create") navigate("/create");
    if (id === "overview") navigate("/");
    if (id === "repos") navigate("/repos");
    if (id === "pulls") navigate("/pulls");
  };

  return (
    <Chrome
      login={login}
      nav={nav}
      onNav={handleNav}
      trackedCount={selectedNames.length}
      title={header.title}
      trailing={header.trailing}
    >
      <div className="t-vt-content flex h-full min-h-0 flex-col">
        <div className="min-h-0 flex-1">
          <Switch>
            {ROUTES.map((route) => (
              <Route
                key={`${route.path}:${account ?? "none"}`}
                path={route.path}
                component={route.component}
              />
            ))}
            <Route path="/boot">
              <Redirect to="/" />
            </Route>
            <Route>
              <Redirect to="/" />
            </Route>
          </Switch>
        </div>
      </div>
    </Chrome>
  );
}
