import { useCallback, useEffect, useMemo, useState } from "react";
import { DEFAULT_WATCHLIST_STATE } from "../model/watchlistDefaults.ts";
import { reorderItems } from "../model/reorderItems.ts";
import {
  DEFAULT_VISIBLE_METRIC_IDS,
  MAX_VISIBLE_METRICS,
  WATCHLIST_METRICS,
} from "../model/stockMetrics.ts";
import { parseWatchlistState, WATCHLIST_STORAGE_KEY } from "../model/watchlistStorage.ts";
import type { Watchlist, WatchlistState } from "../model/watchlistTypes.ts";

export interface UseWatchlistStateResult {
  state: WatchlistState;
  activeList: Watchlist;
  selectedSymbols: string[];
  visibleMetricIds: string[];
  setActiveList(activeListId: string): void;
  toggleComparisonSymbol(symbol: string): void;
  addSymbol(symbol: string): void;
  removeSymbol(symbol: string): void;
  reorderSymbols(fromIndex: number, toIndex: number): void;
  reorderMetrics(fromIndex: number, toIndex: number): void;
  setVisibleMetricIds(metricIds: string[]): void;
  clearComparison(): void;
}

function cloneStringArrayRecord(record: Record<string, string[]>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(record).map(([recordKey, values]) => [recordKey, [...values]]),
  );
}

function cloneDefaultWatchlistState(): WatchlistState {
  return {
    lists: DEFAULT_WATCHLIST_STATE.lists.map((watchlist) => ({
      ...watchlist,
      symbols: [...watchlist.symbols],
    })),
    activeListId: DEFAULT_WATCHLIST_STATE.activeListId,
    selectedSymbolsByListId: cloneStringArrayRecord(
      DEFAULT_WATCHLIST_STATE.selectedSymbolsByListId,
    ),
    visibleMetricIdsByListId: cloneStringArrayRecord(
      DEFAULT_WATCHLIST_STATE.visibleMetricIdsByListId,
    ),
  };
}

function loadInitialWatchlistState(): WatchlistState {
  try {
    return (
      parseWatchlistState(localStorage.getItem(WATCHLIST_STORAGE_KEY)) ??
      cloneDefaultWatchlistState()
    );
  } catch {
    // Storage can be unavailable; the in-memory defaults remain usable.
    return cloneDefaultWatchlistState();
  }
}

export function useWatchlistState(): UseWatchlistStateResult {
  const [state, setState] = useState<WatchlistState>(loadInitialWatchlistState);

  const activeList =
    state.lists.find((watchlist) => watchlist.id === state.activeListId) ?? state.lists[0];
  const selectedSymbols = useMemo(
    () =>
      (state.selectedSymbolsByListId[activeList.id] ?? []).filter((symbol) =>
        activeList.symbols.includes(symbol),
      ),
    [activeList, state.selectedSymbolsByListId],
  );
  const visibleMetricIds =
    state.visibleMetricIdsByListId[activeList.id] ?? DEFAULT_VISIBLE_METRIC_IDS;

  useEffect(() => {
    try {
      localStorage.setItem(WATCHLIST_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, ...state }));
    } catch {
      // Storage can be unavailable; state updates still remain active in memory.
    }
  }, [state]);

  const setActiveList = useCallback((activeListId: string) => {
    setState((currentState) =>
      currentState.lists.some((watchlist) => watchlist.id === activeListId)
        ? { ...currentState, activeListId }
        : currentState,
    );
  }, []);

  const toggleComparisonSymbol = useCallback((symbol: string) => {
    setState((currentState) => {
      const currentList = currentState.lists.find(
        (watchlist) => watchlist.id === currentState.activeListId,
      );
      if (!currentList?.symbols.includes(symbol)) return currentState;

      const currentSelection = currentState.selectedSymbolsByListId[currentList.id] ?? [];
      const nextSelection = currentSelection.includes(symbol)
        ? currentSelection.filter((selectedSymbol) => selectedSymbol !== symbol)
        : [...currentSelection, symbol];

      return {
        ...currentState,
        selectedSymbolsByListId: {
          ...currentState.selectedSymbolsByListId,
          [currentList.id]: nextSelection,
        },
      };
    });
  }, []);

  const addSymbol = useCallback((symbol: string) => {
    setState((currentState) => ({
      ...currentState,
      lists: currentState.lists.map((watchlist) =>
        watchlist.id !== currentState.activeListId || watchlist.symbols.includes(symbol)
          ? watchlist
          : { ...watchlist, symbols: [...watchlist.symbols, symbol] },
      ),
    }));
  }, []);

  const removeSymbol = useCallback((symbol: string) => {
    setState((currentState) => {
      const activeListId = currentState.activeListId;
      return {
        ...currentState,
        lists: currentState.lists.map((watchlist) =>
          watchlist.id === activeListId
            ? {
                ...watchlist,
                symbols: watchlist.symbols.filter((watchlistSymbol) => watchlistSymbol !== symbol),
              }
            : watchlist,
        ),
        selectedSymbolsByListId: {
          ...currentState.selectedSymbolsByListId,
          [activeListId]: (currentState.selectedSymbolsByListId[activeListId] ?? []).filter(
            (selectedSymbol) => selectedSymbol !== symbol,
          ),
        },
      };
    });
  }, []);

  const reorderSymbols = useCallback((fromIndex: number, toIndex: number) => {
    setState((currentState) => ({
      ...currentState,
      lists: currentState.lists.map((watchlist) =>
        watchlist.id === currentState.activeListId
          ? { ...watchlist, symbols: reorderItems(watchlist.symbols, fromIndex, toIndex) }
          : watchlist,
      ),
    }));
  }, []);

  const reorderMetrics = useCallback((fromIndex: number, toIndex: number) => {
    setState((currentState) => {
      const activeListId = currentState.activeListId;
      const currentMetricIds =
        currentState.visibleMetricIdsByListId[activeListId] ?? DEFAULT_VISIBLE_METRIC_IDS;
      return {
        ...currentState,
        visibleMetricIdsByListId: {
          ...currentState.visibleMetricIdsByListId,
          [activeListId]: reorderItems(currentMetricIds, fromIndex, toIndex),
        },
      };
    });
  }, []);

  const setVisibleMetricIds = useCallback((metricIds: string[]) => {
    const knownMetricIds = new Set(WATCHLIST_METRICS.map((metric) => metric.id));
    const validMetricIds = metricIds
      .filter(
        (metricId, index) => knownMetricIds.has(metricId) && metricIds.indexOf(metricId) === index,
      )
      .slice(0, MAX_VISIBLE_METRICS);

    setState((currentState) => ({
      ...currentState,
      visibleMetricIdsByListId: {
        ...currentState.visibleMetricIdsByListId,
        [currentState.activeListId]: validMetricIds,
      },
    }));
  }, []);

  const clearComparison = useCallback(() => {
    setState((currentState) => ({
      ...currentState,
      selectedSymbolsByListId: {
        ...currentState.selectedSymbolsByListId,
        [currentState.activeListId]: [],
      },
    }));
  }, []);

  return {
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
  };
}
