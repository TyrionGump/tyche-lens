import { describe, expect, it } from "vitest";
import { parseWatchlistState } from "./watchlistStorage.ts";

const validEnvelope = {
  schemaVersion: 1,
  lists: [{ id: "main", name: "My Watchlist", symbols: ["AAPL"] }],
  activeListId: "main",
  selectedSymbolsByListId: { main: ["AAPL"] },
  visibleMetricIdsByListId: { main: ["pe"] },
};

describe("parseWatchlistState", () => {
  it("returns null when storage is empty", () => {
    expect(parseWatchlistState(null)).toBeNull();
  });

  it("returns null for malformed JSON", () => {
    expect(parseWatchlistState("{not-json")).toBeNull();
  });

  it("returns null for a different schema version", () => {
    expect(parseWatchlistState(JSON.stringify({ ...validEnvelope, schemaVersion: 2 }))).toBeNull();
  });

  it("returns null when the active list does not exist", () => {
    expect(
      parseWatchlistState(JSON.stringify({ ...validEnvelope, activeListId: "missing" })),
    ).toBeNull();
  });

  it("returns the state fields from a valid versioned envelope", () => {
    expect(parseWatchlistState(JSON.stringify(validEnvelope))).toEqual({
      lists: [{ id: "main", name: "My Watchlist", symbols: ["AAPL"] }],
      activeListId: "main",
      selectedSymbolsByListId: { main: ["AAPL"] },
      visibleMetricIdsByListId: { main: ["pe"] },
    });
  });

  it.each([
    ["non-string list id", { lists: [{ id: 1, name: "My Watchlist", symbols: ["AAPL"] }] }],
    ["non-string list name", { lists: [{ id: "main", name: 1, symbols: ["AAPL"] }] }],
    ["non-string symbol", { lists: [{ id: "main", name: "My Watchlist", symbols: [1] }] }],
    [
      "duplicate list ids",
      {
        lists: [
          { id: "main", name: "First", symbols: ["AAPL"] },
          { id: "main", name: "Second", symbols: ["MSFT"] },
        ],
      },
    ],
    ["non-array selected-symbol record value", { selectedSymbolsByListId: { main: "AAPL" } }],
    ["selection for an unknown list", { selectedSymbolsByListId: { missing: ["AAPL"] } }],
    ["selected symbol outside its list", { selectedSymbolsByListId: { main: ["MSFT"] } }],
    ["non-array metric record value", { visibleMetricIdsByListId: { main: "pe" } }],
    ["metrics for an unknown list", { visibleMetricIdsByListId: { missing: ["pe"] } }],
    ["unknown metric id", { visibleMetricIdsByListId: { main: ["unknown"] } }],
  ])("returns null for %s", (_description, changes) => {
    expect(parseWatchlistState(JSON.stringify({ ...validEnvelope, ...changes }))).toBeNull();
  });
});
