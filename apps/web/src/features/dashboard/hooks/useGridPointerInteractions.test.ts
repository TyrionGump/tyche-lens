import { describe, expect, test } from "vitest";
import { RESIZE_DIRECTIONS } from "./useGridPointerInteractions.ts";

describe("dashboard resize directions", () => {
  test("maps every named handle to explicit edge directions", () => {
    expect(RESIZE_DIRECTIONS).toEqual({
      northWest: { north: true, east: false, south: false, west: true },
      north: { north: true, east: false, south: false, west: false },
      northEast: { north: true, east: true, south: false, west: false },
      east: { north: false, east: true, south: false, west: false },
      southEast: { north: false, east: true, south: true, west: false },
      south: { north: false, east: false, south: true, west: false },
      southWest: { north: false, east: false, south: true, west: true },
      west: { north: false, east: false, south: false, west: true },
    });
  });
});
