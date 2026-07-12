import createClient from "openapi-fetch";
import type { paths } from "./generated/openapi.ts";
import { mapApiQuoteToMarketQuote } from "./mapApiQuoteToMarketQuote.ts";
import type { MarketQuote, SymbolSearchResult } from "../model/marketTypes.ts";

const marketApiClient = createClient<paths>({ baseUrl: "/" });

function createMarketApiError(error: unknown): Error {
  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return new Error(error.message);
  }

  return new Error("Market data request failed");
}

export async function fetchMarketQuotes(
  symbols: readonly string[],
  signal?: AbortSignal,
): Promise<Record<string, MarketQuote>> {
  if (symbols.length === 0) return {};

  const { data, error } = await marketApiClient.GET("/v1/quotes", {
    params: { query: { symbols: symbols.join(",") } },
    signal,
  });

  if (!data) throw createMarketApiError(error);

  return Object.fromEntries(
    data.quotes.map((quote) => {
      const marketQuote = mapApiQuoteToMarketQuote(quote);
      return [marketQuote.symbol, marketQuote];
    }),
  );
}

export async function searchMarketSymbols(
  query: string,
  signal?: AbortSignal,
): Promise<SymbolSearchResult[]> {
  const trimmedQuery = query.trim();
  const { data, error } = await marketApiClient.GET("/v1/symbols", {
    params: { query: trimmedQuery ? { query: trimmedQuery } : {} },
    signal,
  });

  if (!data) throw createMarketApiError(error);

  return data.symbols.map((listing) => ({
    symbol: listing.symbol,
    companyName: listing.name,
    exchange: listing.exchange,
    sector: listing.sector,
  }));
}

export async function fetchMarketHistory(
  symbol: string,
  pointCount: number,
  signal?: AbortSignal,
): Promise<number[]> {
  const { data, error } = await marketApiClient.GET("/v1/quotes/{symbol}/history", {
    params: {
      path: { symbol },
      query: { points: pointCount },
    },
    signal,
  });

  if (!data) throw createMarketApiError(error);

  return data.points;
}
