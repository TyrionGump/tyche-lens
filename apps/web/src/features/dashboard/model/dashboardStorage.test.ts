import { describe, expect, test } from "vitest";
import { acquireDashboardStorage, parseDashboardState } from "./dashboardStorage.ts";

describe("dashboard storage", () => {
  test("returns null when browser storage acquisition throws", () => {
    expect(
      acquireDashboardStorage(() => {
        throw new DOMException("Storage is blocked", "SecurityError");
      }),
    ).toBeNull();
  });

  test("rejects absent, malformed, or unsupported data", () => {
    expect(parseDashboardState(null)).toBeNull();
    expect(parseDashboardState("not json")).toBeNull();
    expect(parseDashboardState(JSON.stringify({ schemaVersion: 2 }))).toBeNull();
  });

  test("parses a valid version-one dashboard state", () => {
    expect(
      parseDashboardState(
        JSON.stringify({
          schemaVersion: 1,
          density: "comfortable",
          widgets: [
            {
              id: "quote-1",
              type: "quote",
              column: 0,
              row: 0,
              columnSpan: 3,
              rowSpan: 2,
            },
          ],
        }),
      ),
    ).toEqual({
      density: "comfortable",
      widgets: [
        {
          id: "quote-1",
          type: "quote",
          column: 0,
          row: 0,
          columnSpan: 3,
          rowSpan: 2,
        },
      ],
    });
  });
});
