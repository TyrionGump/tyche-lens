import { DEFAULT_VISIBLE_METRIC_IDS } from "./stockMetrics.ts";
import type { Watchlist, WatchlistState } from "./watchlistTypes.ts";

export const DEFAULT_WATCHLISTS: Watchlist[] = [
  { id: "main", name: "My Watchlist", symbols: ["AAPL", "NVDA", "TSLA", "MSFT", "AMZN"] },
  { id: "tech", name: "Tech & AI", symbols: ["GOOGL", "META", "AMD", "AVGO", "NFLX"] },
  { id: "energy", name: "Energy", symbols: ["XOM", "CVX", "NEE"] },
];

export const DEFAULT_WATCHLIST_STATE: WatchlistState = {
  lists: DEFAULT_WATCHLISTS,
  activeListId: DEFAULT_WATCHLISTS[0].id,
  selectedSymbolsByListId: {},
  visibleMetricIdsByListId: Object.fromEntries(
    DEFAULT_WATCHLISTS.map((watchlist) => [watchlist.id, [...DEFAULT_VISIBLE_METRIC_IDS]]),
  ),
};
