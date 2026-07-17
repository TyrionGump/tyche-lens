import { generateSampleSeries } from "@/shared/utilities/generateSampleSeries.ts";
import type { MarketIndexQuote } from "../model/marketTypes.ts";

export const MARKET_INDEX_FIXTURES: MarketIndexQuote[] = [
  {
    name: "S&P 500",
    symbol: "SPX",
    value: 6_184.22,
    changePercent: 0.58,
    priceHistory: generateSampleSeries(101, 30, 6_184.22, 0.012),
  },
  {
    name: "Nasdaq",
    symbol: "IXIC",
    value: 20_211.55,
    changePercent: 1.12,
    priceHistory: generateSampleSeries(102, 30, 20_211.55, 0.018),
  },
  {
    name: "Dow 30",
    symbol: "DJI",
    value: 43_698.1,
    changePercent: -0.21,
    priceHistory: generateSampleSeries(103, 30, 43_698.1, 0.009),
  },
  {
    name: "VIX",
    symbol: "VIX",
    value: 14.82,
    changePercent: -3.4,
    priceHistory: generateSampleSeries(104, 30, 14.82, 0.05),
  },
];
