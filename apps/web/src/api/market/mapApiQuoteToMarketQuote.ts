import type { Quote } from "../generated/models/index.ts";
import type { MarketQuote } from "@/domain/market";

export function mapApiQuoteToMarketQuote(quote: Quote): MarketQuote {
  return {
    symbol: quote.symbol,
    companyName: quote.name,
    exchange: quote.exchange,
    sector: quote.sector,
    lastPrice: quote.price,
    priceChange: quote.changeAbs,
    changePercent: quote.changePct,
    openPrice: quote.open,
    dayHigh: quote.high,
    dayLow: quote.low,
    previousClose: quote.prevClose,
    marketCapitalization: quote.marketCap,
    priceToEarningsRatio: quote.peRatio,
    dividendYieldPercent: quote.divYield,
    tradingVolume: quote.volume,
    fiftyTwoWeekHigh: quote.week52High,
    fiftyTwoWeekLow: quote.week52Low,
    beta: quote.beta,
    earningsPerShare: quote.eps,
    description: "",
    priceHistory: [],
    updatedAt: quote.asOf,
  };
}
