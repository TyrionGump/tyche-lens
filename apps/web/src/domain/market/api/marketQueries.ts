import { queryOptions, useQuery } from "@tanstack/react-query";
import type { UseQueryResult } from "@tanstack/react-query";
import { fetchMarketHistory, fetchMarketQuotes, searchMarketSymbols } from "./marketApiClient.ts";
import type { MarketQuote, SymbolSearchResult } from "../model/marketTypes.ts";

export const marketQueryKeys = {
  root: ["market"] as const,
  quotes: (symbols: readonly string[]) => ["market", "quotes", [...symbols].sort()] as const,
  symbolSearch: (query: string) => ["market", "symbol-search", query.trim()] as const,
  history: (symbol: string, pointCount: number) =>
    ["market", "history", symbol, pointCount] as const,
};

export function createMarketQuotesQueryOptions(symbols: readonly string[]) {
  const sortedSymbols = [...symbols].sort();

  return queryOptions({
    queryKey: marketQueryKeys.quotes(sortedSymbols),
    queryFn: ({ signal }) => fetchMarketQuotes(sortedSymbols, signal),
    enabled: sortedSymbols.length > 0,
  });
}

export function createMarketSymbolSearchQueryOptions(query: string) {
  const trimmedQuery = query.trim();

  return queryOptions({
    queryKey: marketQueryKeys.symbolSearch(trimmedQuery),
    queryFn: ({ signal }) => searchMarketSymbols(trimmedQuery, signal),
  });
}

export function createMarketHistoryQueryOptions(symbol: string, pointCount: number) {
  const trimmedSymbol = symbol.trim();

  return queryOptions({
    queryKey: marketQueryKeys.history(trimmedSymbol, pointCount),
    queryFn: ({ signal }) => fetchMarketHistory(trimmedSymbol, pointCount, signal),
    enabled: trimmedSymbol.length > 0,
  });
}

export function useMarketQuotes(
  symbols: readonly string[],
): UseQueryResult<Record<string, MarketQuote>, Error> {
  return useQuery(createMarketQuotesQueryOptions(symbols));
}

export function useMarketSymbolSearch(query: string): UseQueryResult<SymbolSearchResult[], Error> {
  return useQuery(createMarketSymbolSearchQueryOptions(query));
}

export function useMarketHistory(symbol: string, pointCount = 70): UseQueryResult<number[], Error> {
  return useQuery(createMarketHistoryQueryOptions(symbol, pointCount));
}
