import type { KeyboardEvent } from "react";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { MarketQuote } from "@/domain/market/index.ts";
import { useMarketQuotes } from "@/domain/market/index.ts";
import { PageHeader } from "@/shared/components/layout/PageHeader.tsx";
import { mergeClassNames } from "@/shared/utilities/mergeClassNames.ts";
import { AddTickerSearch } from "./components/AddTickerSearch.tsx";
import { CompareTray } from "./components/CompareTray.tsx";
import { StatColumnPicker } from "./components/StatColumnPicker.tsx";
import { StockComparisonDialog } from "./components/StockComparisonDialog.tsx";
import { StockDetailPanel } from "./components/StockDetailPanel.tsx";
import { WatchlistTable } from "./components/WatchlistTable.tsx";
import { useWatchlistState } from "./hooks/useWatchlistState.ts";
import type { WatchlistMetric } from "./model/stockMetrics.ts";
import { WATCHLIST_METRICS } from "./model/stockMetrics.ts";

const EMPTY_QUOTES_BY_SYMBOL: Record<string, MarketQuote> = {};

export function WatchlistPage() {
  const {
    state,
    activeList,
    selectedSymbols,
    visibleMetricIds,
    setActiveList,
    toggleComparisonSymbol,
    addSymbol,
    removeSymbol,
    reorderSymbols,
    reorderMetrics,
    setVisibleMetricIds,
    clearComparison,
  } = useWatchlistState();
  const [detailSymbol, setDetailSymbol] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const isComparisonOpen = searchParams.get("compare") === "1";

  const {
    data: quotesBySymbol = EMPTY_QUOTES_BY_SYMBOL,
    isPending: isQuotesPending,
    error: quotesError,
  } = useMarketQuotes(activeList.symbols);
  const hasQuotes = Object.keys(quotesBySymbol).length > 0;
  const missingQuoteSymbols = activeList.symbols.filter(
    (symbol) => quotesBySymbol[symbol] === undefined,
  );
  const visibleMetrics = visibleMetricIds
    .map((metricId) => WATCHLIST_METRICS.find((metric) => metric.id === metricId))
    .filter((metric): metric is WatchlistMetric => metric !== undefined);
  const detailQuote = detailSymbol ? quotesBySymbol[detailSymbol] : undefined;

  const handleWatchlistTabKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) => {
    let nextIndex: number | undefined;

    if (event.key === "ArrowRight") nextIndex = (currentIndex + 1) % state.lists.length;
    if (event.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + state.lists.length) % state.lists.length;
    }
    if (event.key === "Home") nextIndex = 0;
    if (event.key === "End") nextIndex = state.lists.length - 1;
    if (nextIndex === undefined) return;

    event.preventDefault();
    const nextWatchlist = state.lists[nextIndex];
    setActiveList(nextWatchlist.id);
    document.getElementById(`watchlist-tab-${nextWatchlist.id}`)?.focus();
  };

  // Comparison visibility is route state: opening pushes `?compare=1`, so browser Back closes it.
  const handleOpenComparison = () => {
    setSearchParams((currentParams) => {
      const nextParams = new URLSearchParams(currentParams);
      nextParams.set("compare", "1");
      return nextParams;
    });
  };
  const handleCloseComparison = () => {
    setSearchParams(
      (currentParams) => {
        const nextParams = new URLSearchParams(currentParams);
        nextParams.delete("compare");
        return nextParams;
      },
      { replace: true },
    );
  };

  // Compared companies follow row order, not selection order. Missing API quotes are filtered so
  // a stale persisted symbol cannot crash or create an empty comparison column.
  const comparedQuotes = activeList.symbols
    .filter((symbol) => selectedSymbols.includes(symbol))
    .map((symbol) => quotesBySymbol[symbol])
    .filter((quote): quote is MarketQuote => quote !== undefined);

  // A deep link must not stay armed when its persisted selection or quote data cannot compare.
  useEffect(() => {
    const isWaitingForQuotes = isQuotesPending && activeList.symbols.length > 0;
    if (!isComparisonOpen || isWaitingForQuotes || comparedQuotes.length >= 2) return;

    setSearchParams(
      (currentParams) => {
        const nextParams = new URLSearchParams(currentParams);
        nextParams.delete("compare");
        return nextParams;
      },
      { replace: true },
    );
  }, [
    activeList.symbols.length,
    comparedQuotes.length,
    isComparisonOpen,
    isQuotesPending,
    setSearchParams,
  ]);

  const handleRemoveComparisonSymbol = (symbol: string) => {
    toggleComparisonSymbol(symbol);
    if (comparedQuotes.filter((quote) => quote.symbol !== symbol).length < 2) {
      handleCloseComparison();
    }
  };

  return (
    <div className="flex flex-col">
      <PageHeader
        tabs={
          <div
            className="flex gap-0.75 rounded-panel bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] p-0.75"
            role="tablist"
            aria-label="Watchlists"
          >
            {state.lists.map((watchlist, watchlistIndex) => {
              const isActiveList = watchlist.id === activeList.id;
              return (
                <button
                  key={watchlist.id}
                  id={`watchlist-tab-${watchlist.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isActiveList}
                  aria-controls="watchlist-panel"
                  tabIndex={isActiveList ? 0 : -1}
                  className={mergeClassNames(
                    "inline-flex cursor-pointer items-center gap-2 rounded-control border-none bg-transparent px-3.5 py-2 text-body font-semibold whitespace-nowrap transition-all duration-120",
                    isActiveList
                      ? "bg-card text-ink shadow-[var(--shadow)]"
                      : "text-dim hover:text-ink",
                  )}
                  onClick={() => setActiveList(watchlist.id)}
                  onKeyDown={(event) => handleWatchlistTabKeyDown(event, watchlistIndex)}
                >
                  {watchlist.name}
                  <span
                    className={mergeClassNames(
                      "rounded-full px-1.75 py-px text-caption font-extrabold",
                      isActiveList ? "bg-accent-soft text-accent" : "bg-chip text-faint",
                    )}
                  >
                    {watchlist.symbols.length}
                  </span>
                </button>
              );
            })}
          </div>
        }
        actions={
          <>
            <StatColumnPicker
              visibleMetricIds={visibleMetricIds}
              onChangeVisibleMetricIds={setVisibleMetricIds}
            />
            <AddTickerSearch existingSymbols={activeList.symbols} onAddSymbol={addSymbol} />
          </>
        }
      />

      <div
        id="watchlist-panel"
        role="tabpanel"
        aria-labelledby={`watchlist-tab-${activeList.id}`}
        tabIndex={0}
        className="px-6.5 pt-4.5 pb-20 outline-none"
      >
        {quotesError && hasQuotes && (
          <div className="tl-surface mb-3 px-4 py-3 text-body text-dim" role="status">
            Some quotes may be stale: {quotesError.message}
          </div>
        )}
        {!quotesError && !isQuotesPending && hasQuotes && missingQuoteSymbols.length > 0 && (
          <div className="tl-surface mb-3 px-4 py-3 text-body text-dim" role="status">
            Quote data unavailable for {missingQuoteSymbols.join(", ")}.
          </div>
        )}

        {activeList.symbols.length === 0 ? (
          <div className="tl-surface px-5 py-14 text-center text-body text-dim">
            <b className="mb-1.25 block text-base text-ink">This list is empty</b>
            Use “Add ticker” to start watching companies.
          </div>
        ) : quotesError && !hasQuotes ? (
          <div className="tl-surface px-5 py-14 text-center text-body text-dim" role="alert">
            <b className="mb-1.25 block text-base text-ink">Quotes unavailable</b>
            {quotesError.message}
          </div>
        ) : isQuotesPending && !hasQuotes ? (
          <div className="tl-surface px-5 py-14 text-center text-body text-dim" role="status">
            Loading quotes…
          </div>
        ) : !hasQuotes ? (
          <div className="tl-surface px-5 py-14 text-center text-body text-dim" role="status">
            <b className="mb-1.25 block text-base text-ink">No quotes returned</b>
            Quote data is not available for this list.
          </div>
        ) : (
          <WatchlistTable
            symbols={activeList.symbols}
            quotesBySymbol={quotesBySymbol}
            metrics={visibleMetrics}
            selectedSymbols={selectedSymbols}
            onToggleComparison={toggleComparisonSymbol}
            onOpenDetails={setDetailSymbol}
            onRemoveSymbol={removeSymbol}
            onReorderRows={reorderSymbols}
            onReorderColumns={reorderMetrics}
          />
        )}

        <div className="mt-3 text-center text-label text-faint">
          Click a row for full details · check the box to compare · drag rows to reorder
        </div>
      </div>

      <CompareTray
        selectedSymbols={selectedSymbols}
        canCompare={comparedQuotes.length >= 2}
        onRemoveSymbol={toggleComparisonSymbol}
        onCompare={handleOpenComparison}
        onClear={clearComparison}
      />

      {detailQuote && (
        <StockDetailPanel
          quote={detailQuote}
          isSelectedForComparison={selectedSymbols.includes(detailQuote.symbol)}
          onToggleComparison={() => toggleComparisonSymbol(detailQuote.symbol)}
          onClose={() => setDetailSymbol(null)}
        />
      )}

      {isComparisonOpen && comparedQuotes.length >= 2 && (
        <StockComparisonDialog
          quotes={comparedQuotes}
          onRemoveSymbol={handleRemoveComparisonSymbol}
          onClose={handleCloseComparison}
        />
      )}
    </div>
  );
}
