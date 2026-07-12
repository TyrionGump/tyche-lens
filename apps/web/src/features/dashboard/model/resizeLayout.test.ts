import { describe, expect, test } from "vitest";
import { findNorthResizeLimit } from "./resizeLayout.ts";
import type { DashboardWidgetLayout } from "./dashboardTypes.ts";

function createWidget(
  id: string,
  column: number,
  row: number,
  columnSpan: number,
  rowSpan: number,
): DashboardWidgetLayout {
  return { id, type: "quote", column, row, columnSpan, rowSpan };
}

describe("dashboard resize layout", () => {
  test("uses the greatest bottom edge above the target and ignores horizontally disjoint widgets", () => {
    const target = createWidget("target", 3, 8, 4, 3);
    const widgets = [
      target,
      createWidget("higher-overlap", 2, 1, 3, 2),
      createWidget("nearest-overlap", 5, 4, 3, 3),
      createWidget("disjoint", 8, 6, 2, 2),
    ];

    expect(findNorthResizeLimit(widgets, target)).toBe(7);
  });
});
