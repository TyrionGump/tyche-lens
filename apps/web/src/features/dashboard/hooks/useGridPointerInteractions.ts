import { useEffect, useRef, useState } from "react";
import type { Dispatch, PointerEvent as ReactPointerEvent, RefObject, SetStateAction } from "react";
import { DASHBOARD_COLUMN_COUNT, MAX_WIDGET_ROW_SPAN } from "../model/dashboardDefaults.ts";
import { moveOverlappingWidgetsDown } from "../model/gridLayout.ts";
import {
  buildResizeNeighborModel,
  findNorthResizeLimit,
  layoutEastNeighbors,
  layoutWestNeighbors,
} from "../model/resizeLayout.ts";
import type { DashboardDensityMetrics, DashboardWidgetLayout } from "../model/dashboardTypes.ts";
import { DASHBOARD_WIDGET_CATALOG } from "../widgets/widgetCatalog.ts";

export type ResizeHandle =
  | "northWest"
  | "north"
  | "northEast"
  | "east"
  | "southEast"
  | "south"
  | "southWest"
  | "west";

interface ResizeDirections {
  north: boolean;
  east: boolean;
  south: boolean;
  west: boolean;
}

export const RESIZE_DIRECTIONS: Record<ResizeHandle, ResizeDirections> = {
  northWest: { north: true, east: false, south: false, west: true },
  north: { north: true, east: false, south: false, west: false },
  northEast: { north: true, east: true, south: false, west: false },
  east: { north: false, east: true, south: false, west: false },
  southEast: { north: false, east: true, south: true, west: false },
  south: { north: false, east: false, south: true, west: false },
  southWest: { north: false, east: false, south: true, west: true },
  west: { north: false, east: false, south: false, west: true },
};

export interface DashboardGridInteraction {
  kind: "move" | "resize";
  widgetId: string;
  column: number;
  row: number;
  columnSpan: number;
  rowSpan: number;
  columnContentWidth: number;
  gap: number;
  rowHeight: number;
}

interface UseGridPointerInteractionsOptions {
  gridElementRef: RefObject<HTMLDivElement | null>;
  widgets: DashboardWidgetLayout[];
  setWidgets: Dispatch<SetStateAction<DashboardWidgetLayout[]>>;
  densityMetrics: DashboardDensityMetrics;
}

interface GridPointerInteractions {
  activeInteraction: DashboardGridInteraction | null;
  handleMoveStart(event: ReactPointerEvent, widgetId: string): void;
  handleResizeStart(event: ReactPointerEvent, widgetId: string, handle: ResizeHandle): void;
}

interface GridPixelMetrics {
  rectangle: DOMRect;
  columnContentWidth: number;
  columnStride: number;
  rowStride: number;
}

export function useGridPointerInteractions({
  gridElementRef,
  widgets,
  setWidgets,
  densityMetrics,
}: UseGridPointerInteractionsOptions): GridPointerInteractions {
  const [activeInteraction, setActiveInteraction] = useState<DashboardGridInteraction | null>(null);
  const removePointerListenersRef = useRef<(() => void) | null>(null);

  const clearPointerListeners = () => {
    removePointerListenersRef.current?.();
    removePointerListenersRef.current = null;
  };

  useEffect(
    () => () => {
      clearPointerListeners();
      document.body.classList.remove("tl-noselect", "tl-grabbing");
    },
    [],
  );

  const getGridPixelMetrics = (gridElement: HTMLElement): GridPixelMetrics => {
    const rectangle = gridElement.getBoundingClientRect();
    const { gap, rowHeight } = densityMetrics;
    const columnContentWidth =
      (rectangle.width - gap * (DASHBOARD_COLUMN_COUNT - 1)) / DASHBOARD_COLUMN_COUNT;
    return {
      rectangle,
      columnContentWidth,
      columnStride: columnContentWidth + gap,
      rowStride: rowHeight + gap,
    };
  };

  const trackPointer = (onPointerMove: (event: PointerEvent) => void, bodyClasses: string[]) => {
    clearPointerListeners();
    document.body.classList.add(...bodyClasses);

    const finishInteraction = () => {
      removePointerListeners();
      if (removePointerListenersRef.current === removePointerListeners) {
        removePointerListenersRef.current = null;
      }
      setActiveInteraction(null);
    };
    const removePointerListeners = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", finishInteraction);
      window.removeEventListener("pointercancel", finishInteraction);
      document.body.classList.remove(...bodyClasses);
    };

    removePointerListenersRef.current = removePointerListeners;
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", finishInteraction);
    window.addEventListener("pointercancel", finishInteraction);
  };

  const handleResizeStart = (event: ReactPointerEvent, widgetId: string, handle: ResizeHandle) => {
    event.preventDefault();
    event.stopPropagation();
    const gridElement = gridElementRef.current;
    if (!gridElement) return;

    const { columnContentWidth, columnStride, rowStride } = getGridPixelMetrics(gridElement);
    const snapshot = widgets.map((widget) => ({ ...widget }));
    const target = snapshot.find((widget) => widget.id === widgetId);
    if (!target) return;

    const directions = RESIZE_DIRECTIONS[handle];
    const minimumSpan = DASHBOARD_WIDGET_CATALOG[target.type].minimumSpan;
    const getMinimumColumnSpan = (widget: DashboardWidgetLayout) =>
      DASHBOARD_WIDGET_CATALOG[widget.type].minimumSpan.columnSpan;
    const eastNeighbors = directions.east
      ? buildResizeNeighborModel(snapshot, target, "east", getMinimumColumnSpan)
      : null;
    const westNeighbors = directions.west
      ? buildResizeNeighborModel(snapshot, target, "west", getMinimumColumnSpan)
      : null;
    const maximumEastColumnSpan = eastNeighbors
      ? DASHBOARD_COLUMN_COUNT - target.column - eastNeighbors.requiredSideColumns
      : 0;
    const minimumWestColumn = westNeighbors ? westNeighbors.requiredSideColumns : 0;
    const northResizeLimit = directions.north ? findNorthResizeLimit(snapshot, target) : 0;
    const startClientX = event.clientX;
    const startClientY = event.clientY;

    setActiveInteraction({
      kind: "resize",
      widgetId,
      column: target.column,
      row: target.row,
      columnSpan: target.columnSpan,
      rowSpan: target.rowSpan,
      columnContentWidth,
      gap: densityMetrics.gap,
      rowHeight: densityMetrics.rowHeight,
    });

    const onPointerMove = (pointerEvent: PointerEvent) => {
      const deltaColumns = Math.round((pointerEvent.clientX - startClientX) / columnStride);
      const deltaRows = Math.round((pointerEvent.clientY - startClientY) / rowStride);
      let { column, row, columnSpan, rowSpan } = target;
      let neighborUpdates = new Map<string, { column: number; columnSpan: number }>();

      if (directions.east && eastNeighbors) {
        columnSpan = Math.max(
          minimumSpan.columnSpan,
          Math.min(maximumEastColumnSpan, target.columnSpan + deltaColumns),
        );
        neighborUpdates = layoutEastNeighbors(eastNeighbors, column + columnSpan);
      }
      if (directions.west && westNeighbors) {
        column = Math.max(
          minimumWestColumn,
          Math.min(
            target.column + target.columnSpan - minimumSpan.columnSpan,
            target.column + deltaColumns,
          ),
        );
        columnSpan = target.column + target.columnSpan - column;
        neighborUpdates = layoutWestNeighbors(westNeighbors, column);
      }
      if (directions.south) {
        rowSpan = Math.max(
          minimumSpan.rowSpan,
          Math.min(MAX_WIDGET_ROW_SPAN, target.rowSpan + deltaRows),
        );
      }
      if (directions.north) {
        row = Math.max(
          northResizeLimit,
          Math.min(target.row + target.rowSpan - minimumSpan.rowSpan, target.row + deltaRows),
        );
        rowSpan = target.row + target.rowSpan - row;
      }

      const resizedWidgets = snapshot.map((widget) => {
        if (widget.id === widgetId) return { ...widget, column, row, columnSpan, rowSpan };
        const update = neighborUpdates.get(widget.id);
        return update ? { ...widget, ...update } : widget;
      });
      setActiveInteraction((current) =>
        current ? { ...current, column, row, columnSpan, rowSpan } : current,
      );
      setWidgets(moveOverlappingWidgetsDown(resizedWidgets, widgetId));
    };

    trackPointer(onPointerMove, ["tl-noselect"]);
  };

  const handleMoveStart = (event: ReactPointerEvent, widgetId: string) => {
    event.preventDefault();
    const gridElement = gridElementRef.current;
    if (!gridElement) return;

    const { rectangle, columnContentWidth, columnStride, rowStride } =
      getGridPixelMetrics(gridElement);
    const snapshot = widgets.map((widget) => ({ ...widget }));
    const target = snapshot.find((widget) => widget.id === widgetId);
    if (!target) return;

    const widgetElement = [...gridElement.querySelectorAll<HTMLElement>("[data-widget-id]")].find(
      (element) => element.dataset.widgetId === widgetId,
    );
    if (!widgetElement) return;

    const widgetRectangle = widgetElement.getBoundingClientRect();
    const grabOffsetX = event.clientX - widgetRectangle.left;
    const grabOffsetY = event.clientY - widgetRectangle.top;
    let position = { column: target.column, row: target.row };

    setActiveInteraction({
      kind: "move",
      widgetId,
      column: target.column,
      row: target.row,
      columnSpan: target.columnSpan,
      rowSpan: target.rowSpan,
      columnContentWidth,
      gap: densityMetrics.gap,
      rowHeight: densityMetrics.rowHeight,
    });

    const onPointerMove = (pointerEvent: PointerEvent) => {
      const horizontalPixels = pointerEvent.clientX - rectangle.left - grabOffsetX;
      const verticalPixels = pointerEvent.clientY - rectangle.top - grabOffsetY;
      const column = Math.max(
        0,
        Math.min(
          DASHBOARD_COLUMN_COUNT - target.columnSpan,
          Math.round(horizontalPixels / columnStride),
        ),
      );
      const row = Math.max(0, Math.round(verticalPixels / rowStride));
      if (column === position.column && row === position.row) return;
      position = { column, row };

      // Every preview starts from the gesture snapshot, so moving back restores prior positions.
      const movedWidgets = snapshot.map((widget) =>
        widget.id === widgetId ? { ...widget, column, row } : widget,
      );
      setActiveInteraction((current) => (current ? { ...current, column, row } : current));
      setWidgets(moveOverlappingWidgetsDown(movedWidgets, widgetId));
    };

    trackPointer(onPointerMove, ["tl-noselect", "tl-grabbing"]);
  };

  return { activeInteraction, handleMoveStart, handleResizeStart };
}
