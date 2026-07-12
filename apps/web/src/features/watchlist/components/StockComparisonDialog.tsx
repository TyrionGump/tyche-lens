import { Fragment, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import type { MarketQuote } from "@/domain/market/index.ts";
import { PercentChangeBadge } from "@/shared/components/PercentChangeBadge.tsx";
import { usePortalContainer } from "@/shared/hooks/usePortalContainer.ts";
import { mergeClassNames } from "@/shared/utilities/mergeClassNames.ts";
import { formatCurrency } from "@/shared/utilities/numberFormatters.ts";
import type { StockMetric } from "../model/stockMetrics.ts";
import { STOCK_METRIC_GROUPS } from "../model/stockMetrics.ts";
import { ComparedSymbolChip } from "./ComparedSymbolChip.tsx";
import { PriceRangeBar } from "./PriceRangeBar.tsx";
import styles from "./StockComparisonDialog.module.css";

const COLLAPSED_GROUPS_STORAGE_KEY = "tyche.compare.collapsed.v1";

interface StockComparisonDialogProps {
  quotes: MarketQuote[];
  onRemoveSymbol: (symbol: string) => void;
  onClose: () => void;
}

function loadCollapsedGroupLabels(): string[] {
  try {
    const storedValue: unknown = JSON.parse(
      localStorage.getItem(COLLAPSED_GROUPS_STORAGE_KEY) ?? "null",
    );
    return Array.isArray(storedValue) && storedValue.every((label) => typeof label === "string")
      ? storedValue
      : [];
  } catch {
    return [];
  }
}

export function StockComparisonDialog({
  quotes,
  onRemoveSymbol,
  onClose,
}: StockComparisonDialogProps) {
  const portalContainer = usePortalContainer();
  const [collapsedGroupLabels, setCollapsedGroupLabels] = useState(loadCollapsedGroupLabels);

  const handleToggleGroup = (label: string) => {
    setCollapsedGroupLabels((currentLabels) => {
      const nextLabels = currentLabels.includes(label)
        ? currentLabels.filter((currentLabel) => currentLabel !== label)
        : [...currentLabels, label];
      try {
        localStorage.setItem(COLLAPSED_GROUPS_STORAGE_KEY, JSON.stringify(nextLabels));
      } catch {
        // Storage can be unavailable; collapsed groups still update in memory.
      }
      return nextLabels;
    });
  };

  const gridStyle = {
    gridTemplateColumns: `168px repeat(${quotes.length}, minmax(170px, 1fr))`,
  };

  const findBestColumnIndex = (metric: StockMetric): number => {
    if (!metric.best || !metric.getValue || quotes.length < 2) return -1;

    const values = quotes.map(metric.getValue);
    const knownValues = values.filter((value): value is number => value !== null);
    if (knownValues.length < 2) return -1;

    const targetValue = metric.best === "max" ? Math.max(...knownValues) : Math.min(...knownValues);
    return values.indexOf(targetValue);
  };

  return (
    <Dialog.Root
      open
      onOpenChange={(isOpen) => {
        if (!isOpen) onClose();
      }}
    >
      <Dialog.Portal container={portalContainer ?? undefined}>
        <Dialog.Overlay className="fixed inset-0 z-90 bg-bg data-[state=open]:animate-[overlayIn_0.18s_ease]" />
        <Dialog.Content
          aria-describedby={undefined}
          className="fixed inset-0 z-90 flex flex-col bg-card outline-none data-[state=open]:animate-[sheetUp_0.22s_cubic-bezier(0.2,0.9,0.3,1)]"
        >
          <div className="flex flex-none items-center gap-3.5 border-b border-border px-6 py-4">
            <Dialog.Title asChild>
              <span className="text-title font-extrabold tracking-tight">Compare</span>
            </Dialog.Title>
            <div className="flex flex-initial min-w-0 max-w-3/5 flex-wrap items-center gap-1.5 overflow-hidden py-0.5">
              {quotes.map((quote) => (
                <ComparedSymbolChip
                  key={quote.symbol}
                  symbol={quote.symbol}
                  title="Remove from comparison"
                  onRemove={() => onRemoveSymbol(quote.symbol)}
                />
              ))}
            </div>
            <span className="flex-1" />
            <Dialog.Close asChild>
              <button type="button" className="tl-iconbtn" title="Close (Esc)">
                ✕
              </button>
            </Dialog.Close>
          </div>
          <div className="min-h-0 flex-1 overflow-auto px-4 pb-4">
            <div className={styles.comparisonGrid} style={gridStyle}>
              <div className={styles.cornerCell} />
              {quotes.map((quote) => (
                <div key={quote.symbol} className={styles.columnHeader}>
                  <span className={styles.columnHeaderTitle}>
                    <span className="tl-badge">{quote.symbol.slice(0, 2)}</span>
                    <span className="tl-strong" style={{ fontSize: 15 }}>
                      {quote.symbol}
                    </span>
                  </span>
                  <span className="tl-muted tl-ellip" style={{ display: "block" }}>
                    {quote.companyName}
                  </span>
                  <span className="tl-faint" style={{ display: "block", marginTop: 2 }}>
                    {quote.exchange} · {quote.sector}
                  </span>
                  <span className={styles.quotePrice}>
                    <span className="tl-strong" style={{ fontSize: 19 }}>
                      {formatCurrency(quote.lastPrice)}
                    </span>
                    <PercentChangeBadge percentChange={quote.changePercent} />
                  </span>
                </div>
              ))}
              {STOCK_METRIC_GROUPS.map((group) => {
                const isCollapsed = collapsedGroupLabels.includes(group.label);
                return (
                  <Fragment key={group.label}>
                    <button
                      type="button"
                      className={mergeClassNames(
                        styles.groupLabel,
                        isCollapsed && styles.collapsed,
                      )}
                      onClick={() => handleToggleGroup(group.label)}
                      title={isCollapsed ? "Show group" : "Hide group"}
                    >
                      <span className={styles.groupCaret}>▾</span>
                      {group.label}
                      {isCollapsed && (
                        <span className={styles.groupCount}>{group.metrics.length} hidden</span>
                      )}
                    </button>
                    {!isCollapsed &&
                      group.metrics.map((metric) => {
                        const bestColumnIndex = metric.isRange ? -1 : findBestColumnIndex(metric);
                        return (
                          <Fragment key={metric.label}>
                            <div className={styles.metricLabel}>{metric.label}</div>
                            {quotes.map((quote, columnIndex) => {
                              const isBestValue = columnIndex === bestColumnIndex;
                              return (
                                <div
                                  key={quote.symbol}
                                  className={mergeClassNames(
                                    styles.metricValue,
                                    isBestValue && styles.bestValue,
                                  )}
                                  title={
                                    isBestValue && metric.hint
                                      ? `${metric.hint} of the selection`
                                      : undefined
                                  }
                                >
                                  {metric.isRange ? (
                                    <PriceRangeBar quote={quote} />
                                  ) : (
                                    metric.formatValue?.(quote)
                                  )}
                                </div>
                              );
                            })}
                          </Fragment>
                        );
                      })}
                  </Fragment>
                );
              })}
            </div>
            {quotes.length > 1 && (
              <div className={styles.footerNote}>
                Bold marks the best value of the selection per metric.
              </div>
            )}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
