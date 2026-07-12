import { describe, expect, it } from "vitest";
import { mapApiQuoteToMarketQuote } from "./mapApiQuoteToMarketQuote.ts";

describe("mapApiQuoteToMarketQuote", () => {
  it("maps API names and preserves raw numeric values", () => {
    const quote = mapApiQuoteToMarketQuote({
      symbol: "AAPL",
      name: "Apple Inc.",
      exchange: "NASDAQ",
      sector: "Technology",
      price: 214.52,
      changePct: 1.24,
      changeAbs: 2.63,
      open: 212.1,
      high: 215.3,
      low: 211.75,
      prevClose: 211.89,
      marketCap: 3_280_000_000_000,
      peRatio: 33.1,
      divYield: 0.44,
      volume: 48_200_000,
      week52High: 237.49,
      week52Low: 164.08,
      beta: 1.24,
      eps: 6.49,
      asOf: "2026-07-11T00:00:00Z",
    });

    expect(quote.companyName).toBe("Apple Inc.");
    expect(quote.lastPrice).toBe(214.52);
    expect(quote.marketCapitalization).toBe(3_280_000_000_000);
    expect(quote.tradingVolume).toBe(48_200_000);
    expect(quote.priceHistory).toEqual([]);
    expect(quote.updatedAt).toBe("2026-07-11T00:00:00Z");
  });
});
