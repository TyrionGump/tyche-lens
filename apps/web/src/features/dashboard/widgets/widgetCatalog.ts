import type { DashboardWidgetLayout, DashboardWidgetType } from "../model/dashboardTypes.ts";

export interface DashboardWidgetCatalogEntry {
  label: string;
  title: string | ((widget: DashboardWidgetLayout) => string);
  defaultSpan: { columnSpan: number; rowSpan: number };
  minimumSpan: { columnSpan: number; rowSpan: number };
  edgeToEdge?: boolean;
  initialState?: Pick<DashboardWidgetLayout, "symbol">;
}

export const DASHBOARD_WIDGET_CATALOG: Record<DashboardWidgetType, DashboardWidgetCatalogEntry> = {
  indices: {
    label: "Market indices",
    title: "Market Indices",
    defaultSpan: { columnSpan: 12, rowSpan: 2 },
    minimumSpan: { columnSpan: 4, rowSpan: 2 },
  },
  portfolio: {
    label: "Portfolio value",
    title: "Portfolio Value",
    defaultSpan: { columnSpan: 5, rowSpan: 4 },
    minimumSpan: { columnSpan: 3, rowSpan: 3 },
    edgeToEdge: true,
  },
  chart: {
    label: "Price chart",
    title: (widget) => `${widget.symbol ?? "NVDA"} · Chart`,
    defaultSpan: { columnSpan: 7, rowSpan: 4 },
    minimumSpan: { columnSpan: 3, rowSpan: 3 },
    initialState: { symbol: "NVDA" },
  },
  watchlist: {
    label: "Watchlist",
    title: "Watchlist",
    defaultSpan: { columnSpan: 5, rowSpan: 5 },
    minimumSpan: { columnSpan: 3, rowSpan: 3 },
  },
  allocation: {
    label: "Allocation",
    title: "Allocation",
    defaultSpan: { columnSpan: 3, rowSpan: 5 },
    minimumSpan: { columnSpan: 2, rowSpan: 3 },
  },
  news: {
    label: "Latest news",
    title: "Latest News",
    defaultSpan: { columnSpan: 4, rowSpan: 5 },
    minimumSpan: { columnSpan: 3, rowSpan: 3 },
  },
  quote: {
    label: "Stock quote",
    title: (widget) => `${widget.symbol ?? "AAPL"} · Quote`,
    defaultSpan: { columnSpan: 3, rowSpan: 2 },
    minimumSpan: { columnSpan: 2, rowSpan: 2 },
    initialState: { symbol: "AAPL" },
  },
  movers: {
    label: "Top movers",
    title: "Top Movers",
    defaultSpan: { columnSpan: 3, rowSpan: 4 },
    minimumSpan: { columnSpan: 2, rowSpan: 3 },
  },
};

export const DASHBOARD_WIDGET_ORDER: DashboardWidgetType[] = [
  "portfolio",
  "chart",
  "watchlist",
  "indices",
  "allocation",
  "news",
  "quote",
  "movers",
];
