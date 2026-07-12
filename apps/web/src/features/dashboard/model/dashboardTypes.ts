export type DashboardWidgetType =
  | "indices"
  | "portfolio"
  | "chart"
  | "watchlist"
  | "allocation"
  | "news"
  | "quote"
  | "movers";

export type DashboardDensity = "compact" | "comfortable" | "spacious";

export interface DashboardDensityMetrics {
  label: string;
  gap: number;
  rowHeight: number;
  cardPadding: number;
}

export interface DashboardWidgetLayout {
  id: string;
  type: DashboardWidgetType;
  column: number;
  row: number;
  columnSpan: number;
  rowSpan: number;
  symbol?: string;
}

export interface DashboardState {
  density: DashboardDensity;
  widgets: DashboardWidgetLayout[];
}

export interface GridRectangle {
  column: number;
  row: number;
  columnSpan: number;
  rowSpan: number;
}

export interface GridPosition {
  column: number;
  row: number;
}
