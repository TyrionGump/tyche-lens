export interface Watchlist {
  id: string;
  name: string;
  symbols: string[];
}

export interface WatchlistState {
  lists: Watchlist[];
  activeListId: string;
  selectedSymbolsByListId: Record<string, string[]>;
  visibleMetricIdsByListId: Record<string, string[]>;
}
