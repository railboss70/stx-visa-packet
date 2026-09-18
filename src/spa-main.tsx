import "@/lib/stream-async-iterator";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import {
  Outlet,
  RouterProvider,
  createHashHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { AppErrorComponent } from "@/lib/error-component";
import { CodesPage } from "@/routes/codes";
import { Home } from "@/routes/index";
import { ReportPage } from "@/routes/reports.$id";
import { SettingsPage } from "@/routes/settings";
import "./styles.css";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: Home,
});

const codesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/codes",
  component: CodesPage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const reportRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/reports/$id",
  component: ReportPage,
});

const routeTree = rootRoute.addChildren([indexRoute, codesRoute, settingsRoute, reportRoute]);

const router = createRouter({
  routeTree,
  history: createHashHistory(),
  defaultErrorComponent: AppErrorComponent,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root");

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
