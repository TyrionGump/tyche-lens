import { describe, expect, test } from "vitest";
import {
  findAvailablePosition,
  moveOverlappingWidgetsDown,
  rectanglesOverlap,
} from "./gridLayout.ts";

describe("dashboard grid layout", () => {
  test("detects overlapping rectangles", () => {
    expect(
      rectanglesOverlap(
        { column: 0, row: 0, columnSpan: 2, rowSpan: 2 },
        { column: 1, row: 1, columnSpan: 2, rowSpan: 2 },
      ),
    ).toBe(true);
  });

  test("finds the first available position", () => {
    expect(findAvailablePosition([{ column: 0, row: 0, columnSpan: 2, rowSpan: 2 }], 2, 2)).toEqual(
      {
        column: 2,
        row: 0,
      },
    );
  });

  test("moves a cascading chain of overlapping widgets straight down", () => {
    expect(
      moveOverlappingWidgetsDown(
        [
          {
            id: "anchor",
            type: "quote",
            column: 0,
            row: 0,
            columnSpan: 4,
            rowSpan: 2,
          },
          {
            id: "first",
            type: "quote",
            column: 0,
            row: 1,
            columnSpan: 4,
            rowSpan: 2,
          },
          {
            id: "second",
            type: "quote",
            column: 0,
            row: 2,
            columnSpan: 4,
            rowSpan: 2,
          },
        ],
        "anchor",
      ).map(({ id, row }) => ({ id, row })),
    ).toEqual([
      { id: "anchor", row: 0 },
      { id: "first", row: 2 },
      { id: "second", row: 4 },
    ]);
  });
});
