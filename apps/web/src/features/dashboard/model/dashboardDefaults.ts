import type {
  DashboardDensity,
  DashboardDensityMetrics,
  DashboardState,
  DashboardWidgetLayout,
} from "./dashboardTypes.ts";

export const DASHBOARD_COLUMN_COUNT = 12;
export const MAX_WIDGET_ROW_SPAN = 14;

export const DASHBOARD_DENSITY_METRICS: Record<DashboardDensity, DashboardDensityMetrics> = {
  compact: { label: "Compact", gap: 12, rowHeight: 64, cardPadding: 14 },
  comfortable: { label: "Comfortable", gap: 18, rowHeight: 78, cardPadding: 18 },
  spacious: { label: "Spacious", gap: 24, rowHeight: 92, cardPadding: 24 },
};

const DEFAULT_WIDGET_LAYOUTS: ReadonlyArray<Omit<DashboardWidgetLayout, "id">> = [
  { type: "indices", column: 0, row: 0, columnSpan: 12, rowSpan: 2 },
  { type: "portfolio", column: 0, row: 2, columnSpan: 5, rowSpan: 4 },
  {
    type: "chart",
    column: 5,
    row: 2,
    columnSpan: 7,
    rowSpan: 4,
    symbol: "NVDA",
  },
  { type: "watchlist", column: 0, row: 6, columnSpan: 5, rowSpan: 5 },
  { type: "allocation", column: 5, row: 6, columnSpan: 3, rowSpan: 5 },
  { type: "news", column: 8, row: 6, columnSpan: 4, rowSpan: 5 },
];

export function createDefaultDashboardState(): DashboardState {
  return {
    density: "comfortable",
    widgets: DEFAULT_WIDGET_LAYOUTS.map((widget) => ({
      ...widget,
      id: crypto.randomUUID(),
    })),
  };
}
