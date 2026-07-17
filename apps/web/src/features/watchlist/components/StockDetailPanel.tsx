import { Fragment } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useMarketHistory } from "@/api/market";
import type { MarketQuote } from "@/domain/market";
import { PercentChangeBadge } from "@/shared/components/PercentChangeBadge.tsx";
import { AreaChart } from "@/shared/components/charts/index.ts";
import { usePortalContainer } from "@/shared/hooks/usePortalContainer.ts";
import { mergeClassNames } from "@/shared/utilities/mergeClassNames.ts";
import { formatCurrency } from "@/shared/utilities/numberFormatters.ts";
import { STOCK_METRIC_GROUPS } from "../model/stockMetrics.ts";
import { PriceRangeBar } from "./PriceRangeBar.tsx";

interface StockDetailPanelProps {
  quote: MarketQuote;
  isSelectedForComparison: boolean;
  onToggleComparison: () => void;
  onClose: () => void;
}

const CHART_WIDTH = 760;
const CHART_HEIGHT = 240;

export function StockDetailPanel({
  quote,
  isSelectedForComparison,
  onToggleComparison,
  onClose,
}: StockDetailPanelProps) {
  const portalContainer = usePortalContainer();
  const {
    data: historySeries,
    isPending: isHistoryPending,
    error: historyError,
  } = useMarketHistory(quote.symbol);
  const hasHistory = historySeries !== undefined && historySeries.length > 1;
  const isPositiveChange = quote.changePercent >= 0;

  return (
    <Dialog.Root
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <Dialog.Portal container={portalContainer ?? undefined}>
        <Dialog.Overlay className="fixed inset-0 z-80 bg-[rgba(8,10,18,0.35)] data-[state=open]:animate-[overlayIn_0.16s_ease]" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-80 flex w-108 max-w-[94vw] flex-col border-l border-border bg-card shadow-[-20px_0_50px_rgba(0,0,0,0.2)] outline-none data-[state=open]:animate-[panelIn_0.22s_cubic-bezier(0.2,0.7,0.3,1)]">
          <div className="flex flex-none items-center gap-2.5 border-b border-line px-4 py-3.5">
            <span className="tl-badge">{quote.symbol.slice(0, 2)}</span>
            <span className="min-w-0 flex-1">
              <Dialog.Title asChild>
                <span className="tl-strong" style={{ display: "block", fontSize: 16 }}>
                  {quote.symbol}
                </span>
              </Dialog.Title>
              <Dialog.Description asChild>
                <span className="tl-muted tl-ellip" style={{ display: "block" }}>
                  {quote.companyName}
                </span>
              </Dialog.Description>
            </span>
            <span className="tl-faint whitespace-nowrap">
              {quote.exchange} · {quote.sector}
            </span>
            <Dialog.Close asChild>
              <button type="button" className="tl-iconbtn" title="Close (Esc)">
                ✕
              </button>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pt-3.5 pb-4">
            <div className="flex items-center gap-2.5">
              <span className="text-display font-extrabold tracking-tight tabular-nums">
                {formatCurrency(quote.lastPrice)}
              </span>
              <PercentChangeBadge percentChange={quote.changePercent} />
            </div>
            <div className="mt-2.5 mb-1 h-33">
              {hasHistory ? (
                <AreaChart
                  series={historySeries}
                  isPositiveChange={isPositiveChange}
                  width={CHART_WIDTH}
                  height={CHART_HEIGHT}
                  fillOpacityPercent={14}
                  strokeWidth={2.5}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-body text-faint">
                  {historyError
                    ? "Chart unavailable"
                    : isHistoryPending
                      ? "Loading chart…"
                      : "No chart data available"}
                </div>
              )}
            </div>
            {STOCK_METRIC_GROUPS.map((group) => (
              <div key={group.label}>
                <div className="mt-3.5 pb-1.5 text-micro font-bold tracking-wide text-faint uppercase">
                  {group.label}
                </div>
                <div className="grid grid-cols-[1fr_auto] gap-x-3">
                  {group.metrics.map((metric) => (
                    <Fragment key={metric.label}>
                      <span className="border-t border-line py-1.75 text-body text-dim">
                        {metric.label}
                      </span>
                      <span className="border-t border-line py-1.75 text-right text-body font-semibold tabular-nums">
                        {metric.isRange ? (
                          <PriceRangeBar quote={quote} width={120} />
                        ) : (
                          metric.formatValue?.(quote)
                        )}
                      </span>
                    </Fragment>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex-none border-t border-line px-4 py-3">
            <button
              type="button"
              className={mergeClassNames(
                "w-full cursor-pointer rounded-control border border-accent bg-accent px-3.5 py-2.5 text-body font-bold text-white transition-colors duration-120",
                isSelectedForComparison && "border-accent bg-accent-soft text-accent",
              )}
              onClick={onToggleComparison}
            >
              {isSelectedForComparison ? "✓ Selected for compare" : "＋ Select for compare"}
            </button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
