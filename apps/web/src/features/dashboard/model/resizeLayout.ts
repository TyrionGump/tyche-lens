import { DASHBOARD_COLUMN_COUNT } from "./dashboardDefaults.ts";
import { rectanglesOverlapHorizontally, rectanglesOverlapVertically } from "./gridLayout.ts";
import type { DashboardWidgetLayout } from "./dashboardTypes.ts";

export interface ResizeNeighbor {
  id: string;
  column: number;
  row: number;
  columnSpan: number;
  rowSpan: number;
  minimumColumnSpan: number;
}

export interface ResizeNeighborModel {
  nearestFirst: ResizeNeighbor[];
  requiredOuterColumnsByWidgetId: Map<string, number>;
  requiredSideColumns: number;
  sharesVerticalBand: (first: ResizeNeighbor, second: ResizeNeighbor) => boolean;
}

export interface ResizePlacement {
  column: number;
  columnSpan: number;
}

export function buildResizeNeighborModel(
  snapshot: DashboardWidgetLayout[],
  target: DashboardWidgetLayout,
  side: "east" | "west",
  getMinimumColumnSpan: (widget: DashboardWidgetLayout) => number,
): ResizeNeighborModel {
  const neighbors: ResizeNeighbor[] = snapshot
    .filter(
      (widget) =>
        widget.id !== target.id &&
        rectanglesOverlapVertically(widget, target) &&
        (side === "east"
          ? widget.column >= target.column + target.columnSpan
          : widget.column + widget.columnSpan <= target.column),
    )
    .map((widget) => ({
      id: widget.id,
      column: widget.column,
      row: widget.row,
      columnSpan: widget.columnSpan,
      rowSpan: widget.rowSpan,
      minimumColumnSpan: getMinimumColumnSpan(widget),
    }));

  const sharesVerticalBand = (first: ResizeNeighbor, second: ResizeNeighbor) =>
    first.row < second.row + second.rowSpan && second.row < first.row + first.rowSpan;

  const requiredOuterColumnsByWidgetId = new Map<string, number>();
  const farthestFirst = [...neighbors].sort((first, second) =>
    side === "east" ? second.column - first.column : first.column - second.column,
  );

  for (const neighbor of farthestFirst) {
    let requiredOuterColumns = 0;
    for (const otherNeighbor of neighbors) {
      if (otherNeighbor === neighbor || !sharesVerticalBand(neighbor, otherNeighbor)) continue;

      const isFartherOut =
        side === "east"
          ? otherNeighbor.column >= neighbor.column + neighbor.columnSpan
          : otherNeighbor.column + otherNeighbor.columnSpan <= neighbor.column;
      if (isFartherOut) {
        requiredOuterColumns = Math.max(
          requiredOuterColumns,
          otherNeighbor.minimumColumnSpan +
            (requiredOuterColumnsByWidgetId.get(otherNeighbor.id) ?? 0),
        );
      }
    }
    requiredOuterColumnsByWidgetId.set(neighbor.id, requiredOuterColumns);
  }

  let requiredSideColumns = 0;
  for (const neighbor of neighbors) {
    requiredSideColumns = Math.max(
      requiredSideColumns,
      neighbor.minimumColumnSpan + (requiredOuterColumnsByWidgetId.get(neighbor.id) ?? 0),
    );
  }

  const nearestFirst = [...neighbors].sort((first, second) =>
    side === "east"
      ? first.column - second.column
      : second.column + second.columnSpan - (first.column + first.columnSpan),
  );

  return {
    nearestFirst,
    requiredOuterColumnsByWidgetId,
    requiredSideColumns,
    sharesVerticalBand,
  };
}

export function layoutEastNeighbors(
  model: ResizeNeighborModel,
  newRightColumn: number,
): Map<string, ResizePlacement> {
  const updates = new Map<string, ResizePlacement>();
  const placedNeighbors: Array<{ neighbor: ResizeNeighbor } & ResizePlacement> = [];

  for (const neighbor of model.nearestFirst) {
    let leftBound = newRightColumn;
    for (const placed of placedNeighbors) {
      if (
        model.sharesVerticalBand(placed.neighbor, neighbor) &&
        placed.neighbor.column + placed.neighbor.columnSpan <= neighbor.column
      ) {
        leftBound = Math.max(leftBound, placed.column + placed.columnSpan);
      }
    }

    const column = Math.max(neighbor.column, leftBound);
    const columnSpan = Math.max(
      neighbor.minimumColumnSpan,
      Math.min(
        neighbor.columnSpan,
        DASHBOARD_COLUMN_COUNT -
          column -
          (model.requiredOuterColumnsByWidgetId.get(neighbor.id) ?? 0),
      ),
    );
    placedNeighbors.push({ neighbor, column, columnSpan });
    if (column !== neighbor.column || columnSpan !== neighbor.columnSpan) {
      updates.set(neighbor.id, { column, columnSpan });
    }
  }

  return updates;
}

export function layoutWestNeighbors(
  model: ResizeNeighborModel,
  newLeftColumn: number,
): Map<string, ResizePlacement> {
  const updates = new Map<string, ResizePlacement>();
  const placedNeighbors: Array<{ neighbor: ResizeNeighbor } & ResizePlacement> = [];

  for (const neighbor of model.nearestFirst) {
    let rightBound = newLeftColumn;
    for (const placed of placedNeighbors) {
      if (
        model.sharesVerticalBand(placed.neighbor, neighbor) &&
        placed.neighbor.column >= neighbor.column + neighbor.columnSpan
      ) {
        rightBound = Math.min(rightBound, placed.column);
      }
    }

    const rightColumn = Math.min(neighbor.column + neighbor.columnSpan, rightBound);
    const columnSpan = Math.max(
      neighbor.minimumColumnSpan,
      Math.min(
        neighbor.columnSpan,
        rightColumn - (model.requiredOuterColumnsByWidgetId.get(neighbor.id) ?? 0),
      ),
    );
    const column = rightColumn - columnSpan;
    placedNeighbors.push({ neighbor, column, columnSpan });
    if (column !== neighbor.column || columnSpan !== neighbor.columnSpan) {
      updates.set(neighbor.id, { column, columnSpan });
    }
  }

  return updates;
}

export function findNorthResizeLimit(
  snapshot: DashboardWidgetLayout[],
  target: DashboardWidgetLayout,
): number {
  return Math.max(
    0,
    ...snapshot
      .filter(
        (widget) =>
          widget.id !== target.id &&
          rectanglesOverlapHorizontally(widget, target) &&
          widget.row + widget.rowSpan <= target.row,
      )
      .map((widget) => widget.row + widget.rowSpan),
  );
}
