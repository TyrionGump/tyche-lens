import { MARKET_QUOTE_FIXTURES } from "@/domain/market";
import type { MarketQuote } from "@/domain/market";

export const MARKET_CATALOG = Object.values(MARKET_QUOTE_FIXTURES).sort((left, right) =>
  left.symbol.localeCompare(right.symbol),
);

export function normalizeMarketSymbol(symbol: string): string {
  return symbol.trim().toUpperCase();
}

export function findMarketQuote(symbol: string): MarketQuote | undefined {
  return MARKET_QUOTE_FIXTURES[normalizeMarketSymbol(symbol)];
}

export function searchMarketCatalog(query: string, limit = 20): MarketQuote[] {
  const normalizedQuery = query.trim().toLowerCase();

  return MARKET_CATALOG.filter(
    (quote) =>
      normalizedQuery === "" ||
      quote.symbol.toLowerCase().includes(normalizedQuery) ||
      quote.companyName.toLowerCase().includes(normalizedQuery),
  ).slice(0, Math.max(0, limit));
}
