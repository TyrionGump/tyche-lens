import { describe, expect, it } from "vitest";
import { clampNumber } from "./clampNumber.ts";

describe("clampNumber", () => {
  it("keeps values inside the inclusive range", () => {
    expect(clampNumber(5, 0, 10)).toBe(5);
  });

  it("clamps values outside either boundary", () => {
    expect(clampNumber(-1, 0, 10)).toBe(0);
    expect(clampNumber(11, 0, 10)).toBe(10);
  });
});
