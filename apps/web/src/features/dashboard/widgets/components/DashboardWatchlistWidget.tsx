import { useMarketQuotes } from "@/api/market";
import { DashboardWatchlistQuoteRow } from "./DashboardWatchlistQuoteRow.tsx";

const DASHBOARD_WATCHLIST_SYMBOLS = ["AAPL", "NVDA", "TSLA", "MSFT", "AMZN"];

export function DashboardWatchlistWidget() {
  const quotesQuery = useMarketQuotes(DASHBOARD_WATCHLIST_SYMBOLS);

  if (quotesQuery.isPending) {
    return (
      <div className="tl-muted flex h-full items-center justify-center">Loading watchlist…</div>
    );
  }

  if (quotesQuery.error) {
    return (
      <div className="tl-down flex h-full items-center justify-center text-center text-body">
        Unable to load watchlist: {quotesQuery.error.message}
      </div>
    );
  }

  if (!quotesQuery.data || Object.keys(quotesQuery.data).length === 0) {
    return (
      <div className="tl-muted flex h-full items-center justify-center text-center">
        No watchlist data is available.
      </div>
    );
  }

  return (
    <div className="tl-noscrollbar flex h-full flex-col overflow-auto">
      {DASHBOARD_WATCHLIST_SYMBOLS.map((symbol) => {
        const marketQuote = quotesQuery.data[symbol];
        if (!marketQuote) {
          return (
            <div key={symbol} className="border-t border-line px-0.5 py-2.75 first:border-t-0">
              <span className="tl-strong">{symbol}</span>
              <span className="tl-muted ml-2">Market data unavailable</span>
            </div>
          );
        }

        return <DashboardWatchlistQuoteRow key={marketQuote.symbol} marketQuote={marketQuote} />;
      })}
    </div>
  );
}
