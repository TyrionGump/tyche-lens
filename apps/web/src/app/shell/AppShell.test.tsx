import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, test, vi } from "vitest";
import { AppShell } from "./AppShell.tsx";

const sidebarPreference = vi.hoisted(() => ({
  collapsed: false,
  toggleCollapsed: () => undefined,
}));

vi.mock("./hooks/useSidebarPreference.ts", () => ({
  useSidebarPreference: () => sidebarPreference,
}));

describe("AppShell sidebar state", () => {
  test.each([
    [false, "220px"],
    [true, "64px"],
  ] as const)("maps collapsed=%s to --sidebar-w=%s", (collapsed, sidebarWidth) => {
    sidebarPreference.collapsed = collapsed;

    const markup = renderToStaticMarkup(
      <MemoryRouter>
        <AppShell />
      </MemoryRouter>,
    );
    const rootTag = markup.match(/^<div[^>]*>/)?.[0];
    const styleAttribute = rootTag?.match(/style="([^"]*)"/)?.[1];

    expect(styleAttribute).toContain(`--sidebar-w:${sidebarWidth}`);
  });
});
