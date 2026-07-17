import { describe, expect, it } from "vitest";
import viteConfig from "./vite.config.ts";

function resolveViteConfig(command: "build" | "serve", mode: string) {
  if (typeof viteConfig !== "function") throw new Error("Expected a Vite configuration factory");

  return viteConfig({ command, mode, isSsrBuild: false, isPreview: false });
}

describe("Vite public assets", () => {
  it("uses the isolated worker directory only in mock development", () => {
    expect(resolveViteConfig("serve", "mock")).toMatchObject({ publicDir: "msw-public" });
  });

  it.each([
    ["serve", "api"],
    ["build", "production"],
  ] as const)("keeps the normal public directory for %s in %s mode", (command, mode) => {
    expect(resolveViteConfig(command, mode)).toMatchObject({ publicDir: "public" });
  });
});
