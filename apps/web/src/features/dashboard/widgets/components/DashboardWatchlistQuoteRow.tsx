import { useMarketHistory } from "@/domain/market/index.ts";
import type { MarketQuote } from "@/domain/market/index.ts";
import type { ReactNode } from "react";
import { PercentChangeBadge } from "@/shared/components/PercentChangeBadge.tsx";
import { SparklineChart } from "@/shared/components/charts/index.ts";
import { formatCurrency } from "@/shared/utilities/numberFormatters.ts";

export function DashboardWatchlistQuoteRow({ marketQuote }: { marketQuote: MarketQuote }) {
  const historyQuery = useMarketHistory(marketQuote.symbol, 40);

  let historyContent: ReactNode;
  if (historyQuery.isPending) {
    historyContent = (
      <span className="tl-faint flex h-full items-center justify-center text-micro">
        Loading history…
      </span>
    );
  } else if (historyQuery.error) {
    historyContent = (
      <span
        className="tl-down flex h-full items-center justify-center text-micro"
        title={historyQuery.error.message}
      >
        History error
      </span>
    );
  } else if (historyQuery.data?.length) {
    historyContent = (
      <SparklineChart
        series={historyQuery.data}
        isPositiveChange={marketQuote.changePercent >= 0}
      />
    );
  } else {
    historyContent = (
      <span className="tl-faint flex h-full items-center justify-center text-micro">
        No history
      </span>
    );
  }

  return (
    <div className="grid grid-cols-[34px_minmax(0,1.4fr)_70px_minmax(0,1fr)_auto] items-center gap-2.5 border-t border-line px-0.5 py-2.75 first:border-t-0">
      <div className="tl-badge">{marketQuote.symbol.slice(0, 2)}</div>
      <div className="min-w-0">
        <div className="tl-strong">{marketQuote.symbol}</div>
        <div className="tl-muted tl-ellip">{marketQuote.companyName}</div>
      </div>
      <div className="h-7.5">{historyContent}</div>
      <div className="text-right text-title font-bold">{formatCurrency(marketQuote.lastPrice)}</div>
      <div className="flex justify-end">
        <PercentChangeBadge percentChange={marketQuote.changePercent} />
      </div>
    </div>
  );
}
