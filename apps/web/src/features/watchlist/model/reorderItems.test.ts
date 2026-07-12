import { describe, expect, it } from "vitest";
import { reorderItems } from "./reorderItems.ts";

describe("reorderItems", () => {
  it("moves an item toward the end without mutating the input", () => {
    const items = ["A", "B", "C"];

    expect(reorderItems(items, 0, 2)).toEqual(["B", "C", "A"]);
    expect(items).toEqual(["A", "B", "C"]);
  });

  it("moves an item toward the beginning", () => {
    expect(reorderItems(["A", "B", "C"], 2, 0)).toEqual(["C", "A", "B"]);
  });

  it("returns an equal copy when the indexes match", () => {
    const items = ["A", "B", "C"];
    const result = reorderItems(items, 1, 1);

    expect(result).toEqual(["A", "B", "C"]);
    expect(result).not.toBe(items);
  });
});
