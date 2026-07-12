import { Fragment, useLayoutEffect, useRef } from "react";
import { mergeClassNames } from "@/shared/utilities/mergeClassNames.ts";
import { COMPARISON_SOFT_LIMIT } from "../model/stockMetrics.ts";
import { ComparedSymbolChip } from "./ComparedSymbolChip.tsx";

interface CompareTrayProps {
  selectedSymbols: string[];
  canCompare: boolean;
  onRemoveSymbol: (symbol: string) => void;
  onCompare: () => void;
  onClear: () => void;
}

export function CompareTray({
  selectedSymbols,
  canCompare,
  onRemoveSymbol,
  onCompare,
  onClear,
}: CompareTrayProps) {
  const chipsContainerRef = useRef<HTMLDivElement>(null);
  const previousHeight = useRef<number | null>(null);

  useLayoutEffect(() => {
    const chipsContainer = chipsContainerRef.current;
    if (!chipsContainer) {
      previousHeight.current = null;
      return;
    }

    const height = chipsContainer.offsetHeight;
    if (previousHeight.current !== null && previousHeight.current !== height) {
      chipsContainer.animate(
        [{ height: `${previousHeight.current}px` }, { height: `${height}px` }],
        { duration: 240, easing: "cubic-bezier(.2,.7,.3,1)" },
      );
    }
    previousHeight.current = height;
  }, [selectedSymbols.length]);

  if (selectedSymbols.length === 0) return null;

  const isOverSoftLimit = selectedSymbols.length >= COMPARISON_SOFT_LIMIT;
  return (
    <div className="fixed bottom-5.5 left-[calc((100vw_+_var(--sidebar-w))_/_2)] z-80 flex max-w-[min(880px,calc(100vw_-_var(--sidebar-w)_-_48px))] -translate-x-1/2 items-center gap-3 rounded-tray border border-border bg-card py-2.25 pr-3 pl-4.5 shadow-[0_6px_16px_rgba(20,24,38,0.12),0_22px_48px_rgba(20,24,38,0.22)] transition-[left] duration-160">
      <span className="flex-none text-caption font-extrabold tracking-wide text-faint uppercase">
        Compare
      </span>
      <div
        className="flex flex-initial min-w-0 flex-wrap items-center gap-1.5 overflow-clip py-0.5"
        ref={chipsContainerRef}
      >
        {selectedSymbols.map((symbol, index) => (
          <Fragment key={symbol}>
            {index > 0 && index % (COMPARISON_SOFT_LIMIT - 1) === 0 && (
              <i className="h-0 basis-full" />
            )}
            <ComparedSymbolChip
              symbol={symbol}
              title="Remove from selection"
              onRemove={() => onRemoveSymbol(symbol)}
            />
          </Fragment>
        ))}
      </div>
      <span
        className={mergeClassNames(
          "pointer-events-none absolute right-3.5 bottom-[calc(100%_+_8px)] translate-y-1.5 rounded-full border border-border bg-card px-2.75 py-1.25 text-caption whitespace-nowrap text-dim opacity-0 shadow-[0_4px_14px_rgba(10,14,30,0.1)] [transition:opacity_0.22s_ease,translate_0.26s_cubic-bezier(0.2,0.7,0.3,1)]",
          isOverSoftLimit && "translate-y-0 opacity-100",
        )}
        aria-hidden={!isOverSoftLimit}
      >
        side-by-side reads best under ~{COMPARISON_SOFT_LIMIT}
      </span>
      <button
        type="button"
        className="flex-none cursor-pointer rounded-full bg-accent px-4.5 py-2 text-body font-bold whitespace-nowrap text-white transition-[filter,opacity] duration-120 hover:brightness-108 disabled:cursor-default disabled:opacity-45 disabled:filter-none"
        disabled={!canCompare}
        title={!canCompare ? "Pick at least 2 companies with available quotes" : undefined}
        onClick={onCompare}
      >
        Compare {selectedSymbols.length >= 2 ? selectedSymbols.length : ""} ▸
      </button>
      <button
        type="button"
        className="flex h-7 w-7 flex-none cursor-pointer items-center justify-center rounded-full bg-transparent text-body text-faint transition-colors duration-120 hover:bg-hover hover:text-ink"
        title="Clear selection"
        aria-label="Clear comparison selection"
        onClick={onClear}
      >
        ✕
      </button>
    </div>
  );
}
