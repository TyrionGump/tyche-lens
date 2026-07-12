import type { CSSProperties } from "react";
import type { MarketQuote } from "@/domain/market/index.ts";
import { PercentChangeBadge } from "@/shared/components/PercentChangeBadge.tsx";
import { mergeClassNames } from "@/shared/utilities/mergeClassNames.ts";
import { formatCurrency } from "@/shared/utilities/numberFormatters.ts";
import { useColumnReordering } from "../hooks/useColumnReordering.ts";
import { useRowReordering } from "../hooks/useRowReordering.ts";
import type { WatchlistMetric } from "../model/stockMetrics.ts";
import { PriceRangeBar } from "./PriceRangeBar.tsx";
import styles from "./WatchlistTable.module.css";

interface WatchlistTableProps {
  symbols: readonly string[];
  quotesBySymbol: Partial<Record<string, MarketQuote>>;
  metrics: readonly WatchlistMetric[];
  selectedSymbols: readonly string[];
  onToggleComparison: (symbol: string) => void;
  onOpenDetails: (symbol: string) => void;
  onRemoveSymbol: (symbol: string) => void;
  onReorderRows: (fromIndex: number, toIndex: number) => void;
  onReorderColumns: (fromIndex: number, toIndex: number) => void;
}

export function WatchlistTable({
  symbols,
  quotesBySymbol,
  metrics,
  selectedSymbols,
  onToggleComparison,
  onOpenDetails,
  onRemoveSymbol,
  onReorderRows,
  onReorderColumns,
}: WatchlistTableProps) {
  const { rowDrag, getRowDragProps, shouldSuppressRowClick } = useRowReordering(
    symbols.length,
    onReorderRows,
  );
  const { columnDrag, getColumnDragProps } = useColumnReordering(metrics.length, onReorderColumns);

  // `repeat(0, …)` is invalid CSS and collapses the grid, so omit the metric track when empty.
  const metricColumns = metrics.length > 0 ? ` repeat(${metrics.length}, minmax(86px, 1fr))` : "";
  // Checkbox, company, price, and change stay fixed; only the following metric columns reorder.
  const gridColumns = `44px minmax(150px, 1.4fr) 92px 80px${metricColumns} 30px`;

  const findBestSymbol = (metric: WatchlistMetric): string | null => {
    if (!metric.best || !metric.getValue || symbols.length < 2) return null;

    const values = symbols.map((symbol) => {
      const quote = quotesBySymbol[symbol];
      return quote ? (metric.getValue?.(quote) ?? null) : null;
    });
    const knownValues = values.filter((value): value is number => value !== null);
    if (knownValues.length < 2) return null;

    const targetValue = metric.best === "max" ? Math.max(...knownValues) : Math.min(...knownValues);
    return symbols[values.indexOf(targetValue)] ?? null;
  };
  const bestSymbolByMetric = metrics.map(findBestSymbol);

  const getColumnShift = (columnIndex: number): number => {
    if (!columnDrag) return 0;
    if (
      columnDrag.fromIndex < columnDrag.toIndex &&
      columnIndex > columnDrag.fromIndex &&
      columnIndex <= columnDrag.toIndex
    ) {
      return -columnDrag.columnStride;
    }
    if (
      columnDrag.fromIndex > columnDrag.toIndex &&
      columnIndex >= columnDrag.toIndex &&
      columnIndex < columnDrag.fromIndex
    ) {
      return columnDrag.columnStride;
    }
    return 0;
  };
  const getColumnClassName = (columnIndex: number): string | undefined =>
    !columnDrag
      ? undefined
      : columnIndex === columnDrag.fromIndex
        ? styles.colDragging
        : styles.colShift;
  const getColumnStyle = (columnIndex: number): CSSProperties | undefined => {
    if (!columnDrag) return undefined;
    const offsetX =
      columnIndex === columnDrag.fromIndex ? columnDrag.offsetX : getColumnShift(columnIndex);
    return { transform: `translateX(${offsetX}px)` };
  };

  const getRowShift = (rowIndex: number): number => {
    if (!rowDrag) return 0;
    if (
      rowDrag.fromIndex < rowDrag.toIndex &&
      rowIndex > rowDrag.fromIndex &&
      rowIndex <= rowDrag.toIndex
    ) {
      return -rowDrag.rowStride;
    }
    if (
      rowDrag.fromIndex > rowDrag.toIndex &&
      rowIndex >= rowDrag.toIndex &&
      rowIndex < rowDrag.fromIndex
    ) {
      return rowDrag.rowStride;
    }
    return 0;
  };
  const getRowStyle = (rowIndex: number): CSSProperties => {
    const baseStyle: CSSProperties = { gridTemplateColumns: gridColumns };
    if (!rowDrag) return baseStyle;

    const offsetY = rowDrag.fromIndex === rowIndex ? rowDrag.offsetY : getRowShift(rowIndex);
    return { ...baseStyle, transform: `translateY(${offsetY}px)` };
  };

  return (
    <div
      data-board
      className={mergeClassNames(
        "tl-surface",
        styles.board,
        columnDrag && styles.colDragActive,
        rowDrag && styles.rowDragActive,
      )}
    >
      {columnDrag && (
        <div
          className={styles.colGhost}
          style={{
            left: columnDrag.ghost.left + columnDrag.offsetX,
            width: columnDrag.ghost.width,
          }}
        />
      )}

      <div
        className={mergeClassNames(styles.row, styles.head)}
        style={{ gridTemplateColumns: gridColumns }}
      >
        <span className={styles.headCheck} />
        <span style={{ justifySelf: "start" }}>Company</span>
        <span>Last</span>
        <span>Chg %</span>
        {metrics.map((metric, columnIndex) => (
          <button
            key={metric.id}
            type="button"
            data-col
            className={mergeClassNames(styles.headCol, getColumnClassName(columnIndex))}
            style={getColumnStyle(columnIndex)}
            title="Drag or use arrow keys to reorder columns"
            aria-label={`Reorder ${metric.label} column`}
            onKeyDown={(event) => {
              if (event.key === "ArrowLeft" && columnIndex > 0) {
                event.preventDefault();
                onReorderColumns(columnIndex, columnIndex - 1);
              }
              if (event.key === "ArrowRight" && columnIndex < metrics.length - 1) {
                event.preventDefault();
                onReorderColumns(columnIndex, columnIndex + 1);
              }
            }}
            {...getColumnDragProps(columnIndex, metric.id)}
          >
            {metric.label}
          </button>
        ))}
        <span />
      </div>

      {symbols.map((symbol, rowIndex) => {
        const quote = quotesBySymbol[symbol];
        const isSelectedForComparison = selectedSymbols.includes(symbol);
        const isDraggedRow = rowDrag?.fromIndex === rowIndex;
        return (
          <div
            key={symbol}
            data-row
            className={mergeClassNames(
              styles.row,
              isSelectedForComparison && styles.on,
              isDraggedRow && styles.dragging,
              rowDrag && !isDraggedRow && styles.rowShift,
            )}
            style={getRowStyle(rowIndex)}
            onClick={() => {
              if (shouldSuppressRowClick() || !quote) return;
              onOpenDetails(symbol);
            }}
            {...getRowDragProps(rowIndex, symbol)}
          >
            <button
              type="button"
              className={mergeClassNames(styles.checkZone, isSelectedForComparison && styles.on)}
              aria-label={
                isSelectedForComparison
                  ? `Remove ${symbol} from comparison`
                  : `Add ${symbol} to comparison`
              }
              aria-pressed={isSelectedForComparison}
              title={
                isSelectedForComparison ? "Remove from compare selection" : "Select to compare"
              }
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onToggleComparison(symbol);
              }}
            >
              <span className={mergeClassNames(styles.check, isSelectedForComparison && styles.on)}>
                {isSelectedForComparison ? "✓" : ""}
              </span>
            </button>
            <button
              type="button"
              className={styles.companyButton}
              aria-label={quote ? `Open details for ${symbol}` : `Quote unavailable for ${symbol}`}
              aria-disabled={!quote}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                if (shouldSuppressRowClick() || !quote) return;
                onOpenDetails(symbol);
              }}
            >
              <span className="tl-strong" style={{ display: "block", fontSize: 13.5 }}>
                {symbol}
              </span>
              <span className="tl-muted tl-ellip" style={{ display: "block", fontSize: 11.5 }}>
                {quote?.companyName ?? "Quote unavailable"}
              </span>
            </button>
            <span className="tl-strong">{quote ? formatCurrency(quote.lastPrice) : "—"}</span>
            <span>{quote ? <PercentChangeBadge percentChange={quote.changePercent} /> : "—"}</span>
            {metrics.map((metric, metricIndex) => {
              const isBestValue = bestSymbolByMetric[metricIndex] === symbol;
              return (
                <span
                  key={metric.id}
                  className={mergeClassNames(
                    isBestValue && styles.best,
                    getColumnClassName(metricIndex),
                  )}
                  style={getColumnStyle(metricIndex)}
                  title={isBestValue && metric.hint ? `${metric.hint} of the list` : undefined}
                >
                  {quote ? (
                    metric.isRange ? (
                      <PriceRangeBar quote={quote} width={80} />
                    ) : (
                      metric.formatValue?.(quote)
                    )
                  ) : (
                    "—"
                  )}
                </span>
              );
            })}
            <button
              type="button"
              className={styles.rowRemove}
              title="Remove from list"
              aria-label={`Remove ${symbol} from list`}
              onPointerDown={(event) => event.stopPropagation()}
              onClick={(event) => {
                event.stopPropagation();
                onRemoveSymbol(symbol);
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
