import { useMarketHistory, useMarketQuotes } from "@/domain/market/index.ts";
import type { ReactNode } from "react";
import { AreaChart } from "@/shared/components/charts/index.ts";
import { mergeClassNames } from "@/shared/utilities/mergeClassNames.ts";
import {
  formatCurrency,
  formatSignedNumber,
  formatSignedPercent,
} from "@/shared/utilities/numberFormatters.ts";
import { SymbolSelector } from "./SymbolSelector.tsx";

interface PriceChartWidgetProps {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
}

export function PriceChartWidget({ symbol, onSymbolChange }: PriceChartWidgetProps) {
  const quoteQuery = useMarketQuotes([symbol]);
  const historyQuery = useMarketHistory(symbol);
  const marketQuote = quoteQuery.data?.[symbol];
  const priceHistory = historyQuery.data;

  let quoteSummary: ReactNode;
  if (quoteQuery.isPending) {
    quoteSummary = <div className="tl-muted text-body">Loading quote…</div>;
  } else if (quoteQuery.error) {
    quoteSummary = (
      <div className="tl-down text-body">Unable to load quote: {quoteQuery.error.message}</div>
    );
  } else if (!marketQuote) {
    quoteSummary = (
      <div className="tl-muted text-body">No quote data is available for {symbol}.</div>
    );
  } else {
    quoteSummary = (
      <div>
        <div className="text-display font-extrabold">{formatCurrency(marketQuote.lastPrice)}</div>
        <div
          className={mergeClassNames(
            "mt-0.5 text-body font-semibold",
            marketQuote.changePercent >= 0 ? "tl-up" : "tl-down",
          )}
        >
          {formatSignedNumber(marketQuote.priceChange)} ·{" "}
          {formatSignedPercent(marketQuote.changePercent)}
        </div>
      </div>
    );
  }

  let historyContent: ReactNode;
  if (historyQuery.isPending) {
    historyContent = (
      <div className="tl-muted flex h-full items-center justify-center">Loading price history…</div>
    );
  } else if (historyQuery.error) {
    historyContent = (
      <div className="tl-down flex h-full items-center justify-center text-center text-body">
        Unable to load price history: {historyQuery.error.message}
      </div>
    );
  } else if (!priceHistory?.length) {
    historyContent = (
      <div className="tl-muted flex h-full items-center justify-center text-center">
        No price history is available for {symbol}.
      </div>
    );
  } else {
    const isPositiveChange = marketQuote
      ? marketQuote.changePercent >= 0
      : priceHistory[priceHistory.length - 1] >= priceHistory[0];
    historyContent = <AreaChart series={priceHistory} isPositiveChange={isPositiveChange} />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-1.5 flex flex-none items-start justify-between gap-2.5">
        {quoteSummary}
        <SymbolSelector value={symbol} onChange={onSymbolChange} />
      </div>
      <div className="min-h-0 flex-1">{historyContent}</div>
    </div>
  );
}
