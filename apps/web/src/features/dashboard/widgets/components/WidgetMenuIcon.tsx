import type { ReactNode } from "react";
import type { DashboardWidgetType } from "../../model/dashboardTypes.ts";

const WIDGET_ICON_CONTENT: Record<DashboardWidgetType, ReactNode> = {
  indices: (
    <>
      <rect x="1.5" y="3" width="3.5" height="12" rx="1" />
      <rect x="7.2" y="3" width="3.5" height="12" rx="1" />
      <rect x="13" y="3" width="3.5" height="12" rx="1" />
    </>
  ),
  portfolio: (
    <>
      <rect x="2" y="2.5" width="14" height="13" rx="2" />
      <path d="M5.5 9h7M5.5 12h4" />
    </>
  ),
  chart: <path d="M2 13l4-4 3 2 6-7" />,
  watchlist: <path d="M2.5 4.5h13M2.5 9h13M2.5 13.5h13" />,
  allocation: (
    <>
      <circle cx="9" cy="9" r="6.5" />
      <path d="M9 9V2.5M9 9l5 3" />
    </>
  ),
  news: (
    <>
      <rect x="2" y="3" width="14" height="12" rx="1.5" />
      <path d="M5 6.5h6M5 9.5h6M5 12h4" />
    </>
  ),
  quote: (
    <>
      <path d="M3 12l3.5-4 2.5 2 5-6" />
      <path d="M2.5 15h13" />
    </>
  ),
  movers: (
    <>
      <path d="M3 11l3-3 2.5 2L14 4m0 0v4m0-4h-4" />
    </>
  ),
};

export function WidgetMenuIcon({ widgetType }: { widgetType: DashboardWidgetType }) {
  return (
    <svg
      aria-hidden="true"
      width="18"
      height="18"
      viewBox="0 0 18 18"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-accent"
    >
      {WIDGET_ICON_CONTENT[widgetType]}
    </svg>
  );
}
