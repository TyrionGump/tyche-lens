import type { MarketQuote } from "@/domain/market/index.ts";
import {
  formatCompactNumber,
  formatCurrency,
  formatNumber,
  formatSignedPercent,
} from "@/shared/utilities/numberFormatters.ts";

export const MAX_VISIBLE_METRICS = 8;
export const COMPARISON_SOFT_LIMIT = 7;

export interface StockMetric {
  label: string;
  formatValue?: (quote: MarketQuote) => string;
  getValue?: (quote: MarketQuote) => number | null;
  best?: "min" | "max";
  hint?: string;
  isRange?: boolean;
}

export interface WatchlistMetric extends StockMetric {
  id: string;
}

export interface StockMetricGroup {
  label: string;
  metrics: StockMetric[];
}

function formatNullable(value: number | null, formatter: (knownValue: number) => string): string {
  return value === null ? "N/A" : formatter(value);
}

export const WATCHLIST_METRICS: WatchlistMetric[] = [
  {
    id: "pe",
    label: "P/E",
    formatValue: (quote) =>
      formatNullable(quote.priceToEarningsRatio, (value) => formatNumber(value, 1)),
    getValue: (quote) => quote.priceToEarningsRatio,
    best: "min",
    hint: "Cheapest valuation",
  },
  {
    id: "eps",
    label: "EPS",
    formatValue: (quote) => formatNullable(quote.earningsPerShare, formatCurrency),
    getValue: (quote) => quote.earningsPerShare,
    best: "max",
    hint: "Highest earnings/share",
  },
  {
    id: "mcap",
    label: "Mkt cap",
    formatValue: (quote) => formatCompactNumber(quote.marketCapitalization),
    getValue: (quote) => quote.marketCapitalization,
    best: "max",
    hint: "Largest",
  },
  {
    id: "div",
    label: "Div yield",
    formatValue: (quote) =>
      formatNullable(quote.dividendYieldPercent, (value) => `${formatNumber(value, 2)}%`),
    getValue: (quote) => quote.dividendYieldPercent,
    best: "max",
    hint: "Highest yield",
  },
  {
    id: "beta",
    label: "Beta",
    formatValue: (quote) => formatNullable(quote.beta, (value) => formatNumber(value, 2)),
    getValue: (quote) => quote.beta,
    best: "min",
    hint: "Least volatile",
  },
  {
    id: "vol",
    label: "Volume",
    formatValue: (quote) => formatCompactNumber(quote.tradingVolume),
    getValue: (quote) => quote.tradingVolume,
    best: "max",
    hint: "Most traded",
  },
  {
    id: "hi52",
    label: "vs 52W high",
    formatValue: (quote) =>
      formatSignedPercent((quote.lastPrice / quote.fiftyTwoWeekHigh - 1) * 100),
    getValue: (quote) => quote.lastPrice / quote.fiftyTwoWeekHigh,
    best: "max",
    hint: "Closest to its high",
  },
  { id: "range", label: "52W range", isRange: true },
];

export const DEFAULT_VISIBLE_METRIC_IDS = ["pe", "div", "beta"];

export const STOCK_METRIC_GROUPS: StockMetricGroup[] = [
  {
    label: "Today",
    metrics: [
      { label: "Open", formatValue: (quote) => formatCurrency(quote.openPrice) },
      { label: "Day high", formatValue: (quote) => formatCurrency(quote.dayHigh) },
      { label: "Day low", formatValue: (quote) => formatCurrency(quote.dayLow) },
      { label: "Prev close", formatValue: (quote) => formatCurrency(quote.previousClose) },
      {
        label: "Volume",
        formatValue: (quote) => formatCompactNumber(quote.tradingVolume),
        getValue: (quote) => quote.tradingVolume,
        best: "max",
        hint: "Most traded",
      },
    ],
  },
  {
    label: "Valuation",
    metrics: [
      {
        label: "Market cap",
        formatValue: (quote) => formatCompactNumber(quote.marketCapitalization),
        getValue: (quote) => quote.marketCapitalization,
        best: "max",
        hint: "Largest",
      },
      {
        label: "P/E ratio",
        formatValue: (quote) =>
          formatNullable(quote.priceToEarningsRatio, (value) => formatNumber(value, 1)),
        getValue: (quote) => quote.priceToEarningsRatio,
        best: "min",
        hint: "Cheapest valuation",
      },
      {
        label: "EPS",
        formatValue: (quote) => formatNullable(quote.earningsPerShare, formatCurrency),
        getValue: (quote) => quote.earningsPerShare,
        best: "max",
        hint: "Highest earnings/share",
      },
    ],
  },
  {
    label: "Income",
    metrics: [
      {
        label: "Dividend yield",
        formatValue: (quote) =>
          formatNullable(quote.dividendYieldPercent, (value) => `${formatNumber(value, 2)}%`),
        getValue: (quote) => quote.dividendYieldPercent,
        best: "max",
        hint: "Highest yield",
      },
    ],
  },
  {
    label: "Risk & range",
    metrics: [
      {
        label: "Beta",
        formatValue: (quote) => formatNullable(quote.beta, (value) => formatNumber(value, 2)),
        getValue: (quote) => quote.beta,
        best: "min",
        hint: "Least volatile",
      },
      { label: "52W high", formatValue: (quote) => formatCurrency(quote.fiftyTwoWeekHigh) },
      { label: "52W low", formatValue: (quote) => formatCurrency(quote.fiftyTwoWeekLow) },
      {
        label: "vs 52W high",
        formatValue: (quote) =>
          formatSignedPercent((quote.lastPrice / quote.fiftyTwoWeekHigh - 1) * 100),
        getValue: (quote) => quote.lastPrice / quote.fiftyTwoWeekHigh,
        best: "max",
        hint: "Closest to its high",
      },
      { label: "52W range", isRange: true },
    ],
  },
];
