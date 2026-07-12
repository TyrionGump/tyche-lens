import { isValidElement } from "react";
import type { RouteObject } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";

const browserRouterMock = vi.hoisted(() => ({ routes: [] as unknown[] }));

vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...actual,
    createBrowserRouter: (routes: unknown[]) => {
      browserRouterMock.routes = routes;
      return { routes };
    },
  };
});

vi.mock("@/features/dashboard", () => ({ DashboardPage: () => null }));
vi.mock("@/features/watchlist", () => ({ WatchlistPage: () => null }));
vi.mock("./RouteErrorPage.tsx", () => ({ RouteErrorPage: () => null }));
vi.mock("./shell/AppShell.tsx", () => ({ AppShell: () => null }));

describe("application routes", () => {
  test("provides standalone root and themed descendant error boundaries", async () => {
    await import("./router.tsx");

    const rootRoute = browserRouterMock.routes[0] as RouteObject;
    const descendantBoundary = rootRoute.children?.[0];

    expect(isValidElement(rootRoute.errorElement)).toBe(true);
    expect(isValidElement(descendantBoundary?.errorElement)).toBe(true);

    if (!isValidElement(rootRoute.errorElement)) return;
    expect(rootRoute.errorElement.props).toMatchObject({ standalone: true });

    if (!isValidElement(descendantBoundary?.errorElement)) return;
    expect(descendantBoundary.errorElement.props).not.toMatchObject({ standalone: true });
  });
});
