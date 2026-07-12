import type {
  DashboardDensity,
  DashboardState,
  DashboardWidgetLayout,
  DashboardWidgetType,
} from "./dashboardTypes.ts";

export const DASHBOARD_STORAGE_KEY = "tyche.dashboard";
const DASHBOARD_SCHEMA_VERSION = 1;

type DashboardStorage = Pick<Storage, "getItem" | "setItem">;

const DASHBOARD_DENSITIES = new Set<DashboardDensity>(["compact", "comfortable", "spacious"]);
const DASHBOARD_WIDGET_TYPES = new Set<DashboardWidgetType>([
  "indices",
  "portfolio",
  "chart",
  "watchlist",
  "allocation",
  "news",
  "quote",
  "movers",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function isPositiveInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function parseWidget(value: unknown): DashboardWidgetLayout | null {
  if (!isRecord(value)) return null;

  const { id, type, column, row, columnSpan, rowSpan, symbol } = value;
  if (
    typeof id !== "string" ||
    id.trim().length === 0 ||
    typeof type !== "string" ||
    !DASHBOARD_WIDGET_TYPES.has(type as DashboardWidgetType) ||
    !isNonNegativeInteger(column) ||
    !isNonNegativeInteger(row) ||
    !isPositiveInteger(columnSpan) ||
    !isPositiveInteger(rowSpan) ||
    (symbol !== undefined && typeof symbol !== "string")
  ) {
    return null;
  }

  const widget: DashboardWidgetLayout = {
    id,
    type: type as DashboardWidgetType,
    column,
    row,
    columnSpan,
    rowSpan,
  };
  if (symbol !== undefined) widget.symbol = symbol;
  return widget;
}

export function parseDashboardState(serialized: string | null): DashboardState | null {
  if (serialized === null) return null;

  try {
    const value: unknown = JSON.parse(serialized);
    if (!isRecord(value) || value.schemaVersion !== DASHBOARD_SCHEMA_VERSION) return null;
    if (
      typeof value.density !== "string" ||
      !DASHBOARD_DENSITIES.has(value.density as DashboardDensity) ||
      !Array.isArray(value.widgets)
    ) {
      return null;
    }

    const widgets = value.widgets.map(parseWidget);
    if (widgets.some((widget) => widget === null)) return null;

    return {
      density: value.density as DashboardDensity,
      widgets: widgets as DashboardWidgetLayout[],
    };
  } catch {
    return null;
  }
}

export function acquireDashboardStorage(
  getStorage: () => DashboardStorage = () => localStorage,
): DashboardStorage | null {
  try {
    return getStorage();
  } catch {
    return null;
  }
}

export function loadDashboardState(
  storage: Pick<Storage, "getItem"> | null,
): DashboardState | null {
  if (!storage) return null;

  try {
    return parseDashboardState(storage.getItem(DASHBOARD_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function saveDashboardState(
  state: DashboardState,
  storage: Pick<Storage, "setItem"> | null,
): void {
  if (!storage) return;

  try {
    storage.setItem(
      DASHBOARD_STORAGE_KEY,
      JSON.stringify({ schemaVersion: DASHBOARD_SCHEMA_VERSION, ...state }),
    );
  } catch {
    // Persistence is optional when browser storage is unavailable.
  }
}
