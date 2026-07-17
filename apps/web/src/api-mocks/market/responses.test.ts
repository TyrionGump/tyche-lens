import { describe, expect, it } from "vitest";
import {
  GetQuoteHistoryResponse,
  GetQuotesResponse,
  GetSymbolsResponse,
} from "../../api/generated/validation.ts";
import { mapApiQuoteToMarketQuote } from "../../api/market/mapApiQuoteToMarketQuote.ts";
import { MARKET_QUOTE_FIXTURES } from "@/domain/market";
import {
  createMockHistoryResponse,
  createMockQuotesResponse,
  createMockSymbolsResponse,
} from "./responses.ts";

const FIXED_AS_OF = "2026-07-15T09:30:00.000Z";

describe("mock market responses", () => {
  it("builds requested known quotes in request order", () => {
    const response = createMockQuotesResponse(["nvda", "UNKNOWN", " AAPL "], FIXED_AS_OF);

    expect(GetQuotesResponse.safeParse(response).success).toBe(true);
    expect(response.quotes.map((quote) => quote.symbol)).toEqual(["NVDA", "AAPL"]);
    expect(response.quotes.every((quote) => quote.asOf === FIXED_AS_OF)).toBe(true);
  });

  it("preserves fixture values through the API adapter", () => {
    const [apiQuote] = createMockQuotesResponse(["AAPL"], FIXED_AS_OF).quotes;
    const marketQuote = mapApiQuoteToMarketQuote(apiQuote);
    const fixture = MARKET_QUOTE_FIXTURES.AAPL;

    expect(marketQuote).toMatchObject({
      symbol: fixture.symbol,
      companyName: fixture.companyName,
      exchange: fixture.exchange,
      sector: fixture.sector,
      lastPrice: fixture.lastPrice,
      priceChange: fixture.priceChange,
      changePercent: fixture.changePercent,
      openPrice: fixture.openPrice,
      dayHigh: fixture.dayHigh,
      dayLow: fixture.dayLow,
      previousClose: fixture.previousClose,
      marketCapitalization: fixture.marketCapitalization,
      tradingVolume: fixture.tradingVolume,
      fiftyTwoWeekHigh: fixture.fiftyTwoWeekHigh,
      fiftyTwoWeekLow: fixture.fiftyTwoWeekLow,
      updatedAt: FIXED_AS_OF,
    });
  });

  it("keeps generated quotes internally consistent and preserves zero values", () => {
    const firstResponse = createMockQuotesResponse(Object.keys(MARKET_QUOTE_FIXTURES), FIXED_AS_OF);
    const secondResponse = createMockQuotesResponse(
      Object.keys(MARKET_QUOTE_FIXTURES),
      FIXED_AS_OF,
    );
    const { quotes } = firstResponse;

    expect(firstResponse).toEqual(secondResponse);

    for (const quote of quotes) {
      expect(quote.price).toBeGreaterThanOrEqual(0);
      expect(quote.marketCap).toBeGreaterThanOrEqual(0);
      expect(quote.volume).toBeGreaterThanOrEqual(0);
      expect(quote.low).toBeLessThanOrEqual(quote.price);
      expect(quote.high).toBeGreaterThanOrEqual(quote.price);
      expect(quote.week52Low).toBeLessThanOrEqual(quote.price);
      expect(quote.week52High).toBeGreaterThanOrEqual(quote.price);
      expect(quote.changePct).toBeCloseTo((quote.changeAbs / quote.prevClose) * 100, 2);
    }

    expect(quotes.find((quote) => quote.symbol === "TSLA")?.divYield).toBe(0);
  });

  it("returns a sorted catalogue and searches symbol or company name case-insensitively", () => {
    const catalogueResponse = createMockSymbolsResponse("");
    const catalogue = catalogueResponse.symbols;
    const symbols = catalogue.map((listing) => listing.symbol);

    expect(GetSymbolsResponse.safeParse(catalogueResponse).success).toBe(true);
    expect(symbols).toEqual([...symbols].sort());
    expect(createMockSymbolsResponse("apple").symbols.map((listing) => listing.symbol)).toEqual([
      "AAPL",
    ]);
    expect(createMockSymbolsResponse("NvD").symbols.map((listing) => listing.symbol)).toEqual([
      "NVDA",
    ]);
    expect(createMockSymbolsResponse("nasdaq").symbols).toEqual([]);
  });

  it("builds deterministic history with the requested closing value", () => {
    const first = createMockHistoryResponse("aapl", 5);
    const second = createMockHistoryResponse("AAPL", 5);

    expect(GetQuoteHistoryResponse.safeParse(first).success).toBe(true);
    expect(first).toEqual(second);
    expect(first?.symbol).toBe("AAPL");
    expect(first?.points).toHaveLength(5);
    expect(first?.points.at(-1)).toBe(MARKET_QUOTE_FIXTURES.AAPL.lastPrice);
    expect(createMockHistoryResponse("UNKNOWN", 5)).toBeUndefined();
  });
});
