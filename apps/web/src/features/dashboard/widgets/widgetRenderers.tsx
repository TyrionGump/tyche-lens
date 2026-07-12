import type { ReactNode } from "react";
import type { DashboardWidgetLayout, DashboardWidgetType } from "../model/dashboardTypes.ts";
import { DASHBOARD_WIDGET_CATALOG } from "./widgetCatalog.ts";
import { DashboardWatchlistWidget } from "./components/DashboardWatchlistWidget.tsx";
import { MarketIndicesWidget } from "./components/MarketIndicesWidget.tsx";
import { MarketNewsWidget } from "./components/MarketNewsWidget.tsx";
import { PortfolioAllocationWidget } from "./components/PortfolioAllocationWidget.tsx";
import { PortfolioValueWidget } from "./components/PortfolioValueWidget.tsx";
import { PriceChartWidget } from "./components/PriceChartWidget.tsx";
import { StockQuoteWidget } from "./components/StockQuoteWidget.tsx";
import { TopMoversWidget } from "./components/TopMoversWidget.tsx";

export type UpdateDashboardWidget = (updates: Partial<DashboardWidgetLayout>) => void;
export type DashboardWidgetRenderer = (
  widget: DashboardWidgetLayout,
  updateWidget: UpdateDashboardWidget,
) => ReactNode;

export const DASHBOARD_WIDGET_RENDERERS: Record<DashboardWidgetType, DashboardWidgetRenderer> = {
  indices: () => <MarketIndicesWidget />,
  portfolio: () => <PortfolioValueWidget />,
  chart: (widget, updateWidget) => (
    <PriceChartWidget
      symbol={widget.symbol ?? "NVDA"}
      onSymbolChange={(symbol) => updateWidget({ symbol })}
    />
  ),
  watchlist: () => <DashboardWatchlistWidget />,
  allocation: () => <PortfolioAllocationWidget />,
  news: () => <MarketNewsWidget />,
  quote: (widget, updateWidget) => (
    <StockQuoteWidget
      symbol={widget.symbol ?? "AAPL"}
      onSymbolChange={(symbol) => updateWidget({ symbol })}
    />
  ),
  movers: () => <TopMoversWidget />,
};

export function renderDashboardWidget(
  widget: DashboardWidgetLayout,
  updateWidget: UpdateDashboardWidget,
): ReactNode {
  return DASHBOARD_WIDGET_RENDERERS[widget.type](widget, updateWidget);
}

export function getDashboardWidgetTitle(widget: DashboardWidgetLayout): string {
  const title = DASHBOARD_WIDGET_CATALOG[widget.type].title;
  return typeof title === "function" ? title(widget) : title;
}
