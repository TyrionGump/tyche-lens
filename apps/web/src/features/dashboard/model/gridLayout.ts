import { DASHBOARD_COLUMN_COUNT } from "./dashboardDefaults.ts";
import type { DashboardWidgetLayout, GridPosition, GridRectangle } from "./dashboardTypes.ts";

const MAX_POSITION_SEARCH_ROWS = 400;

export function rectanglesOverlap(first: GridRectangle, second: GridRectangle): boolean {
  return (
    first.column < second.column + second.columnSpan &&
    second.column < first.column + first.columnSpan &&
    first.row < second.row + second.rowSpan &&
    second.row < first.row + first.rowSpan
  );
}

export function rectanglesOverlapVertically(first: GridRectangle, second: GridRectangle): boolean {
  return first.row < second.row + second.rowSpan && second.row < first.row + first.rowSpan;
}

export function rectanglesOverlapHorizontally(
  first: GridRectangle,
  second: GridRectangle,
): boolean {
  return (
    first.column < second.column + second.columnSpan &&
    second.column < first.column + first.columnSpan
  );
}

export function findAvailablePosition(
  rectangles: GridRectangle[],
  columnSpan: number,
  rowSpan: number,
): GridPosition {
  for (let row = 0; row < MAX_POSITION_SEARCH_ROWS; row++) {
    for (let column = 0; column <= DASHBOARD_COLUMN_COUNT - columnSpan; column++) {
      const candidate = { column, row, columnSpan, rowSpan };
      if (!rectangles.some((rectangle) => rectanglesOverlap(candidate, rectangle))) {
        return { column, row };
      }
    }
  }

  return { column: 0, row: 0 };
}

export function moveOverlappingWidgetsDown(
  widgets: DashboardWidgetLayout[],
  anchorId: string,
): DashboardWidgetLayout[] {
  const anchor = widgets.find((widget) => widget.id === anchorId);
  if (!anchor) return widgets;

  const remainingWidgets = widgets
    .filter((widget) => widget.id !== anchorId)
    .sort((first, second) => first.row - second.row || first.column - second.column);
  const placedRectangles: GridRectangle[] = [anchor];
  const resolvedRowsByWidgetId = new Map<string, number>();

  for (const widget of remainingWidgets) {
    let row = widget.row;
    let attempts = 0;
    while (
      placedRectangles.some((rectangle) => rectanglesOverlap({ ...widget, row }, rectangle)) &&
      attempts++ < MAX_POSITION_SEARCH_ROWS
    ) {
      row++;
    }

    resolvedRowsByWidgetId.set(widget.id, row);
    placedRectangles.push({ ...widget, row });
  }

  return widgets.map((widget) => {
    const resolvedRow = resolvedRowsByWidgetId.get(widget.id);
    return resolvedRow === undefined || resolvedRow === widget.row
      ? widget
      : { ...widget, row: resolvedRow };
  });
}
