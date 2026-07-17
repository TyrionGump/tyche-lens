import { faker } from "@faker-js/faker";
import type {
  Error as ApiError,
  HistoryResponse,
  Listing,
  Quote,
  QuotesResponse,
  SymbolsResponse,
} from "../../api/generated/models/index.ts";
import { generateSampleSeries } from "../../shared/utilities/generateSampleSeries.ts";
import type { MarketQuote } from "@/domain/market";
import {
  getGetQuoteHistoryResponseMock200,
  getGetQuoteHistoryResponseMock400,
  getGetQuoteHistoryResponseMock404,
  getGetQuoteHistoryResponseMock503,
  getGetQuotesResponseMock200,
  getGetQuotesResponseMock400,
  getGetQuotesResponseMock503,
  getGetSymbolsResponseMock200,
  getGetSymbolsResponseMock400,
  getGetSymbolsResponseMock500,
} from "../generated/client.faker.ts";
import { findMarketQuote, searchMarketCatalog } from "./catalog.ts";

function createStableSeed(seedKey: string): number {
  let seed = 7;

  for (const character of seedKey.trim().toUpperCase()) {
    seed = (seed * 31 + character.codePointAt(0)!) % 9_973;
  }

  return seed;
}

function createSeededContractValue<Value>(seedKey: string, factory: () => Value): Value {
  faker.seed(createStableSeed(seedKey));
  return factory();
}

function createMockQuote(fixture: MarketQuote, asOf: string): Quote {
  const generatedQuote = createSeededContractValue(
    `quote:${fixture.symbol}`,
    () => getGetQuotesResponseMock200().quotes[0],
  );

  return {
    ...generatedQuote,
    symbol: fixture.symbol,
    name: fixture.companyName,
    exchange: fixture.exchange,
    sector: fixture.sector,
    price: fixture.lastPrice,
    changePct: fixture.changePercent,
    changeAbs: fixture.priceChange,
    open: fixture.openPrice,
    high: fixture.dayHigh,
    low: fixture.dayLow,
    prevClose: fixture.previousClose,
    marketCap: fixture.marketCapitalization,
    volume: fixture.tradingVolume,
    week52High: fixture.fiftyTwoWeekHigh,
    week52Low: fixture.fiftyTwoWeekLow,
    peRatio: fixture.priceToEarningsRatio,
    eps: fixture.earningsPerShare,
    divYield: fixture.dividendYieldPercent,
    beta: fixture.beta,
    asOf,
  };
}

function createMockListing(fixture: MarketQuote): Listing {
  const generatedListing = createSeededContractValue(
    `listing:${fixture.symbol}`,
    () => getGetSymbolsResponseMock200().symbols[0],
  );

  return {
    ...generatedListing,
    symbol: fixture.symbol,
    name: fixture.companyName,
    exchange: fixture.exchange,
    sector: fixture.sector,
  };
}

export function createMockQuotesResponse(symbols: readonly string[], asOf: string): QuotesResponse {
  const quotes = symbols.flatMap((symbol) => {
    const fixture = findMarketQuote(symbol);
    return fixture ? [createMockQuote(fixture, asOf)] : [];
  });

  return createSeededContractValue(`quotes:${symbols.join(",")}`, () =>
    getGetQuotesResponseMock200({ quotes }),
  );
}

export function createMockSymbolsResponse(query: string): SymbolsResponse {
  const symbols = searchMarketCatalog(query).map(createMockListing);
  return createSeededContractValue(`symbols:${query}`, () =>
    getGetSymbolsResponseMock200({ symbols }),
  );
}

export function createMockHistoryResponse(
  symbol: string,
  pointCount: number,
): HistoryResponse | undefined {
  const fixture = findMarketQuote(symbol);
  if (!fixture || pointCount < 1) return undefined;

  return createSeededContractValue(`history:${fixture.symbol}:${pointCount}`, () =>
    getGetQuoteHistoryResponseMock200({
      symbol: fixture.symbol,
      points: generateSampleSeries(
        createStableSeed(fixture.symbol),
        pointCount,
        fixture.lastPrice,
        0.05,
      ),
    }),
  );
}

export function createEmptyMockQuotesResponse(): QuotesResponse {
  return createSeededContractValue("quotes:empty", () =>
    getGetQuotesResponseMock200({ quotes: [] }),
  );
}

export function createMockQuotesBadRequest(message: string): ApiError {
  return createSeededContractValue(`quotes:400:${message}`, () =>
    getGetQuotesResponseMock400({ code: "invalid_request", message }),
  );
}

export function createMockQuotesUnavailableResponse(): ApiError {
  return createSeededContractValue("quotes:503", () =>
    getGetQuotesResponseMock503({
      code: "quote_source_unavailable",
      message: "Quote source is unavailable",
    }),
  );
}

export function createEmptyMockSymbolsResponse(): SymbolsResponse {
  return createSeededContractValue("symbols:empty", () =>
    getGetSymbolsResponseMock200({ symbols: [] }),
  );
}

export function createMockSymbolsBadRequest(message: string): ApiError {
  return createSeededContractValue(`symbols:400:${message}`, () =>
    getGetSymbolsResponseMock400({ code: "invalid_request", message }),
  );
}

export function createMockSymbolsUnavailableResponse(): ApiError {
  return createSeededContractValue("symbols:500", () =>
    getGetSymbolsResponseMock500({
      code: "internal_error",
      message: "Symbol search is unavailable",
    }),
  );
}

export function createEmptyMockHistoryResponse(symbol: string): HistoryResponse {
  return createSeededContractValue(`history:empty:${symbol}`, () =>
    getGetQuoteHistoryResponseMock200({ symbol, points: [] }),
  );
}

export function createMockHistoryBadRequest(message: string): ApiError {
  return createSeededContractValue(`history:400:${message}`, () =>
    getGetQuoteHistoryResponseMock400({ code: "invalid_request", message }),
  );
}

export function createMockHistoryNotFound(symbol: string): ApiError {
  return createSeededContractValue(`history:404:${symbol}`, () =>
    getGetQuoteHistoryResponseMock404({
      code: "not_found",
      message: `unknown symbol "${symbol}"`,
    }),
  );
}

export function createMockHistoryUnavailableResponse(): ApiError {
  return createSeededContractValue("history:503", () =>
    getGetQuoteHistoryResponseMock503({
      code: "quote_source_unavailable",
      message: "Quote history source is unavailable",
    }),
  );
}
