import { isValidElement } from "react";
import { describe, expect, it, vi } from "vitest";
import type { DashboardWidgetLayout } from "../model/dashboardTypes.ts";
import {
  DASHBOARD_WIDGET_RENDERERS,
  getDashboardWidgetTitle,
  renderDashboardWidget,
} from "./widgetRenderers.tsx";

const quoteWidget: DashboardWidgetLayout = {
  id: "quote-1",
  type: "quote",
  column: 0,
  row: 0,
  columnSpan: 3,
  rowSpan: 2,
  symbol: "MSFT",
};

describe("dashboard widget renderers", () => {
  it("provides a renderer for every dashboard widget type", () => {
    expect(Object.keys(DASHBOARD_WIDGET_RENDERERS)).toEqual([
      "indices",
      "portfolio",
      "chart",
      "watchlist",
      "allocation",
      "news",
      "quote",
      "movers",
    ]);
  });

  it("renders the selected widget and derives its readable title", () => {
    expect(isValidElement(renderDashboardWidget(quoteWidget, vi.fn()))).toBe(true);
    expect(getDashboardWidgetTitle(quoteWidget)).toBe("MSFT · Quote");
  });
});
