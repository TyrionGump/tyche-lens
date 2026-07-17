import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { type SymbolSearchResult, useMarketSymbolSearch } from "@/api/market";
import { mergeClassNames } from "@/shared/utilities/mergeClassNames.ts";
import { useClickOutside } from "../hooks/useClickOutside.ts";

interface AddTickerSearchProps {
  existingSymbols: readonly string[];
  onAddSymbol: (symbol: string) => void;
}

const SEARCH_DEBOUNCE_MS = 150;
const SEARCH_RESULTS_ID = "ticker-search-results";
const EMPTY_SEARCH_RESULTS: SymbolSearchResult[] = [];

export function AddTickerSearch({ existingSymbols, onAddSymbol }: AddTickerSearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [activeMatchIndex, setActiveMatchIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const handleClose = useCallback(() => {
    setIsOpen(false);
    setActiveMatchIndex(-1);
  }, []);
  useClickOutside(containerRef, handleClose, isOpen);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [query]);

  const {
    data: listings = EMPTY_SEARCH_RESULTS,
    isPending: isSearchPending,
    error: searchError,
  } = useMarketSymbolSearch(debouncedQuery);
  const isWaitingForDebounce = query !== debouncedQuery;
  const matches = useMemo(
    () =>
      isWaitingForDebounce
        ? []
        : listings.filter((listing) => !existingSymbols.includes(listing.symbol)).slice(0, 7),
    [existingSymbols, isWaitingForDebounce, listings],
  );
  const activeMatch = matches[activeMatchIndex];

  useEffect(() => {
    setActiveMatchIndex(isOpen && matches.length > 0 ? 0 : -1);
  }, [isOpen, matches]);

  const handleAddSymbol = (symbol: string) => {
    onAddSymbol(symbol);
    setQuery("");
    setDebouncedQuery("");
    handleClose();
  };

  return (
    <div className="relative" ref={containerRef}>
      <div
        className={mergeClassNames(
          "flex w-57.5 items-center gap-2 rounded-panel border border-border bg-card px-3.5 py-2.25 transition-[border-color,box-shadow] duration-120",
          isOpen && "border-accent shadow-[0_0_0_3px_var(--accent-soft)]",
        )}
      >
        <span className="text-title text-faint">⌕</span>
        <input
          aria-label="Add ticker"
          role="combobox"
          aria-haspopup="listbox"
          aria-autocomplete="list"
          aria-expanded={isOpen}
          aria-controls={isOpen ? SEARCH_RESULTS_ID : undefined}
          aria-activedescendant={
            isOpen && activeMatch ? `ticker-search-option-${activeMatch.symbol}` : undefined
          }
          className="min-w-0 flex-1 border-none bg-transparent text-body font-semibold text-ink outline-none placeholder:font-medium placeholder:text-faint"
          value={query}
          placeholder="Add ticker…"
          onFocus={() => {
            setIsOpen(true);
            setActiveMatchIndex(matches.length > 0 ? 0 : -1);
          }}
          onBlur={(event) => {
            if (!containerRef.current?.contains(event.relatedTarget)) handleClose();
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setIsOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setIsOpen(true);
              setActiveMatchIndex((currentIndex) =>
                matches.length === 0 ? -1 : (currentIndex + 1 + matches.length) % matches.length,
              );
            }
            if (event.key === "ArrowUp") {
              event.preventDefault();
              setIsOpen(true);
              setActiveMatchIndex((currentIndex) =>
                matches.length === 0 ? -1 : (currentIndex - 1 + matches.length) % matches.length,
              );
            }
            if (event.key === "Enter" && activeMatch) {
              event.preventDefault();
              handleAddSymbol(activeMatch.symbol);
            }
            if (event.key === "Escape") {
              handleClose();
              event.currentTarget.blur();
            }
          }}
        />
      </div>
      {isOpen && (
        <div
          id={SEARCH_RESULTS_ID}
          role="listbox"
          aria-label="Ticker search results"
          aria-live="polite"
          aria-busy={isWaitingForDebounce || isSearchPending}
          className="absolute top-[calc(100%+8px)] right-0 z-60 flex w-75 flex-col gap-0.5 rounded-panel border border-border bg-card p-1.5 shadow-[var(--shadow)]"
        >
          {matches.length === 0 && (
            <div
              role="option"
              aria-selected={false}
              aria-disabled="true"
              className="px-3 py-3.5 text-center text-body text-dim"
            >
              {isWaitingForDebounce || isSearchPending
                ? "Searching…"
                : searchError
                  ? "Search unavailable"
                  : `No matches${query ? ` for “${query}”` : ""}`}
            </div>
          )}
          {matches.map((listing, matchIndex) => (
            <button
              key={listing.symbol}
              id={`ticker-search-option-${listing.symbol}`}
              type="button"
              role="option"
              tabIndex={-1}
              aria-selected={matchIndex === activeMatchIndex}
              className={mergeClassNames(
                "grid cursor-pointer grid-cols-[34px_minmax(0,1fr)_auto_18px] items-center gap-2.5 rounded-control border-none bg-transparent px-2.25 py-2 text-left text-ink transition-colors duration-120 hover:bg-accent-soft",
                matchIndex === activeMatchIndex && "bg-accent-soft",
              )}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveMatchIndex(matchIndex)}
              onClick={() => handleAddSymbol(listing.symbol)}
            >
              <span className="tl-badge">{listing.symbol.slice(0, 2)}</span>
              <span className="flex min-w-0 flex-col text-body">
                <span className="tl-strong">{listing.symbol}</span>
                <span className="tl-muted tl-ellip">{listing.companyName}</span>
              </span>
              <span className="tl-faint">{listing.sector}</span>
              <span className="font-extrabold text-accent">＋</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
