import type { ReactNode } from "react";
import { useMarketHistory, useMarketQuotes } from "@/api/market";
import { PercentChangeBadge } from "@/shared/components/PercentChangeBadge.tsx";
import { SparklineChart } from "@/shared/components/charts/index.ts";
import { formatCurrency } from "@/shared/utilities/numberFormatters.ts";
import { SymbolSelector } from "./SymbolSelector.tsx";

interface StockQuoteWidgetProps {
  symbol: string;
  onSymbolChange: (symbol: string) => void;
}

export function StockQuoteWidget({ symbol, onSymbolChange }: StockQuoteWidgetProps) {
  const quoteQuery = useMarketQuotes([symbol]);
  const historyQuery = useMarketHistory(symbol, 40);
  const marketQuote = quoteQuery.data?.[symbol];
  const priceHistory = historyQuery.data;

  let quoteContent: ReactNode;
  if (quoteQuery.isPending) {
    quoteContent = <div className="tl-muted mt-2 text-body">Loading quote…</div>;
  } else if (quoteQuery.error) {
    quoteContent = (
      <div className="tl-down mt-2 text-body">Unable to load quote: {quoteQuery.error.message}</div>
    );
  } else if (!marketQuote) {
    quoteContent = (
      <div className="tl-muted mt-2 text-body">No quote data is available for {symbol}.</div>
    );
  } else {
    quoteContent = (
      <div className="mt-2 text-display font-extrabold">
        {formatCurrency(marketQuote.lastPrice)}
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
    historyContent = (
      <SparklineChart series={priceHistory} isPositiveChange={isPositiveChange} strokeWidth={2.4} />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between">
        <SymbolSelector value={symbol} onChange={onSymbolChange} />
        {marketQuote && <PercentChangeBadge percentChange={marketQuote.changePercent} />}
      </div>
      {quoteContent}
      <div className="mt-1 min-h-0 flex-1">{historyContent}</div>
    </div>
  );
}
