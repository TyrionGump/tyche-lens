import { WATCHLIST_METRICS } from "./stockMetrics.ts";
import type { Watchlist, WatchlistState } from "./watchlistTypes.ts";

export const WATCHLIST_STORAGE_KEY = "tyche.watchlists";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isWatchlist(value: unknown): value is Watchlist {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    isStringArray(value.symbols)
  );
}

function isWatchlistArray(value: unknown): value is Watchlist[] {
  return Array.isArray(value) && value.length > 0 && value.every(isWatchlist);
}

function parseStringArrayRecord(value: unknown): Record<string, string[]> | null {
  if (!isRecord(value)) return null;

  const parsedRecord: Record<string, string[]> = {};
  for (const [entryKey, entryValue] of Object.entries(value)) {
    if (!isStringArray(entryValue)) return null;
    parsedRecord[entryKey] = entryValue;
  }

  return parsedRecord;
}

export function parseWatchlistState(serialized: string | null): WatchlistState | null {
  if (serialized === null) return null;

  try {
    const envelope: unknown = JSON.parse(serialized);
    if (!isRecord(envelope) || envelope.schemaVersion !== 1) return null;
    if (!isWatchlistArray(envelope.lists) || typeof envelope.activeListId !== "string") {
      return null;
    }

    const listIds = envelope.lists.map((watchlist) => watchlist.id);
    if (new Set(listIds).size !== listIds.length || !listIds.includes(envelope.activeListId)) {
      return null;
    }

    const selectedSymbolsByListId = parseStringArrayRecord(envelope.selectedSymbolsByListId);
    const visibleMetricIdsByListId = parseStringArrayRecord(envelope.visibleMetricIdsByListId);
    if (selectedSymbolsByListId === null || visibleMetricIdsByListId === null) return null;

    const watchlistsById = new Map(
      envelope.lists.map((watchlist) => [watchlist.id, watchlist] as const),
    );
    const hasValidSelections = Object.entries(selectedSymbolsByListId).every(
      ([watchlistId, selectedSymbols]) => {
        const watchlist = watchlistsById.get(watchlistId);
        return (
          watchlist !== undefined &&
          selectedSymbols.every((symbol) => watchlist.symbols.includes(symbol))
        );
      },
    );
    if (!hasValidSelections) return null;

    const validMetricIds = new Set(WATCHLIST_METRICS.map((metric) => metric.id));
    const hasValidMetrics = Object.entries(visibleMetricIdsByListId).every(
      ([watchlistId, metricIds]) =>
        watchlistsById.has(watchlistId) &&
        metricIds.every((metricId) => validMetricIds.has(metricId)),
    );
    if (!hasValidMetrics) return null;

    return {
      lists: envelope.lists.map((watchlist) => ({
        ...watchlist,
        symbols: [...watchlist.symbols],
      })),
      activeListId: envelope.activeListId,
      selectedSymbolsByListId,
      visibleMetricIdsByListId,
    };
  } catch {
    return null;
  }
}
