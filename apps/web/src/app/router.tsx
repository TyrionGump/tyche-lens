import { createBrowserRouter, Navigate } from "react-router-dom";
import { DashboardPage } from "@/features/dashboard";
import { WatchlistPage } from "@/features/watchlist";
import { RouteErrorPage } from "./RouteErrorPage.tsx";
import { AppShell } from "./shell/AppShell.tsx";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    errorElement: <RouteErrorPage standalone />,
    children: [
      {
        errorElement: <RouteErrorPage />,
        children: [
          { index: true, element: <Navigate to="/dashboard" replace /> },
          { path: "dashboard", element: <DashboardPage /> },
          { path: "watchlist", element: <WatchlistPage /> },
          { path: "*", element: <Navigate to="/dashboard" replace /> },
        ],
      },
    ],
  },
]);
