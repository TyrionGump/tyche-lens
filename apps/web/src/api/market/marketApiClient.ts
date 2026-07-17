import { getQuoteHistory, getQuotes, getSymbols } from "../generated/client.ts";
import type { MarketQuote, SymbolSearchResult } from "@/domain/market";
import { mapApiQuoteToMarketQuote } from "./mapApiQuoteToMarketQuote.ts";

function createMarketApiError(error: unknown): Error {
  if (error instanceof globalThis.Error) return error;

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

async function requestMarketApi<Response>(request: () => Promise<Response>): Promise<Response> {
  try {
    return await request();
  } catch (error) {
    throw createMarketApiError(error);
  }
}

export async function fetchMarketQuotes(
  symbols: readonly string[],
  signal?: AbortSignal,
): Promise<Record<string, MarketQuote>> {
  if (symbols.length === 0) return {};

  const response = await requestMarketApi(() => getQuotes({ symbols: [...symbols] }, { signal }));

  if (response.status !== 200) throw createMarketApiError(response.data);

  return Object.fromEntries(
    response.data.quotes.map((quote) => {
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
  const response = await requestMarketApi(() =>
    getSymbols(trimmedQuery ? { query: trimmedQuery } : undefined, { signal }),
  );

  if (response.status !== 200) throw createMarketApiError(response.data);

  return response.data.symbols.map((listing) => ({
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
  const response = await requestMarketApi(() =>
    getQuoteHistory(symbol, { points: pointCount }, { signal }),
  );

  if (response.status !== 200) throw createMarketApiError(response.data);

  return response.data.points;
}
