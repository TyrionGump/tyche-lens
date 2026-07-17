import { describe, expect, it } from "vitest";

describe("API mock ownership", () => {
  it("keeps API mocking under the top-level api-mocks module", () => {
    const apiMockModules = import.meta.glob([
      "/src/api-mocks/startApiMocking.ts",
      "/src/api-mocks/generated/*",
      "/src/api-mocks/market/handlers.ts",
      "/src/api-mocks/market/responses.ts",
      "/src/api/generated/*.msw.ts",
      "/src/app/mockApi/browser.ts",
      "/src/domain/market/mockApi.ts",
      "/src/domain/market/mock.ts",
      "/src/domain/market/api/mock/*.ts",
    ]);

    expect(Object.keys(apiMockModules).sort()).toEqual([
      "/src/api-mocks/generated/client.faker.ts",
      "/src/api-mocks/market/handlers.ts",
      "/src/api-mocks/market/responses.ts",
      "/src/api-mocks/startApiMocking.ts",
    ]);
  });

  it("does not retain the ambiguous top-level mocks module", () => {
    const legacyMockModules = import.meta.glob("/src/mocks/**/*.ts");

    expect(Object.keys(legacyMockModules)).toEqual([]);
  });
});
