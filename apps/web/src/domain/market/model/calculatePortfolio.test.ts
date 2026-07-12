import { describe, expect, it } from "vitest";
import type { MarketQuote } from "./marketTypes.ts";
import { calculatePortfolio } from "./calculatePortfolio.ts";

const marketQuote: MarketQuote = {
  symbol: "AAA",
  companyName: "AAA Inc.",
  exchange: "TEST",
  sector: "Technology",
  lastPrice: 15,
  priceChange: 1,
  changePercent: 7.14,
  openPrice: 14,
  dayHigh: 16,
  dayLow: 13,
  previousClose: 14,
  marketCapitalization: 1_000_000,
  priceToEarningsRatio: 10,
  dividendYieldPercent: null,
  tradingVolume: 100_000,
  fiftyTwoWeekHigh: 20,
  fiftyTwoWeekLow: 8,
  beta: 1,
  earningsPerShare: 1.5,
  description: "Test quote",
  priceHistory: [14, 15],
  updatedAt: null,
};

describe("calculatePortfolio", () => {
  it("calculates position values and portfolio totals from raw market quotes", () => {
    const portfolio = calculatePortfolio([{ symbol: "AAA", shareCount: 2, averageCost: 10 }], {
      AAA: marketQuote,
    });

    expect(portfolio).toMatchObject({
      marketValue: 30,
      costBasis: 20,
      totalGain: 10,
      dayChange: 2,
    });
    expect(portfolio.positions[0]).toMatchObject({
      symbol: "AAA",
      marketValue: 30,
      costBasis: 20,
      totalGain: 10,
      weightPercent: 100,
    });
  });
});
