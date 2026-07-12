import type { PointerEvent as ReactPointerEvent } from "react";
import { mergeClassNames } from "@/shared/utilities/mergeClassNames.ts";
import type { ResizeHandle } from "../../hooks/useGridPointerInteractions.ts";
import type { DashboardWidgetLayout } from "../../model/dashboardTypes.ts";
import { DASHBOARD_WIDGET_CATALOG } from "../../widgets/widgetCatalog.ts";
import { getDashboardWidgetTitle, renderDashboardWidget } from "../../widgets/widgetRenderers.tsx";
import styles from "./DashboardGrid.module.css";

const RESIZE_HANDLES: ResizeHandle[] = [
  "northWest",
  "north",
  "northEast",
  "east",
  "southEast",
  "south",
  "southWest",
  "west",
];

const HANDLE_CLASS_SUFFIX: Record<ResizeHandle, string> = {
  northWest: "nw",
  north: "n",
  northEast: "ne",
  east: "e",
  southEast: "se",
  south: "s",
  southWest: "sw",
  west: "w",
};

function ResizeHandleGlyph({ handle }: { handle: ResizeHandle }) {
  if (handle === "north" || handle === "south") {
    return (
      <svg width="24" height="6" viewBox="0 0 24 6">
        <line
          x1="3"
          y1="3"
          x2="21"
          y2="3"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }
  if (handle === "east" || handle === "west") {
    return (
      <svg width="6" height="24" viewBox="0 0 6 24">
        <line
          x1="3"
          y1="3"
          x2="3"
          y2="21"
          stroke="currentColor"
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  const cornerPaths: Record<"northWest" | "northEast" | "southEast" | "southWest", string> = {
    northWest: "M14 2 H9 Q2 2 2 9 V14",
    northEast: "M2 2 H7 Q14 2 14 9 V14",
    southEast: "M14 2 V7 Q14 14 7 14 H2",
    southWest: "M2 2 V7 Q2 14 9 14 H14",
  };
  return (
    <svg width="16" height="16" viewBox="0 0 16 16">
      <path
        d={cornerPaths[handle]}
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface DashboardWidgetCardProps {
  widget: DashboardWidgetLayout;
  isDragging: boolean;
  isResizing: boolean;
  onRemove(widgetId: string): void;
  onUpdate(widgetId: string, updates: Partial<DashboardWidgetLayout>): void;
  onResizeStart(event: ReactPointerEvent, widgetId: string, handle: ResizeHandle): void;
  onMoveStart(event: ReactPointerEvent, widgetId: string): void;
}

export function DashboardWidgetCard({
  widget,
  isDragging,
  isResizing,
  onRemove,
  onUpdate,
  onResizeStart,
  onMoveStart,
}: DashboardWidgetCardProps) {
  const catalogEntry = DASHBOARD_WIDGET_CATALOG[widget.type];

  return (
    <div
      className={mergeClassNames(
        styles.card,
        isDragging && styles.dragging,
        isResizing && styles.resizing,
      )}
      data-widget-id={widget.id}
      style={{
        gridColumn: `${widget.column + 1} / span ${widget.columnSpan}`,
        gridRow: `${widget.row + 1} / span ${widget.rowSpan}`,
      }}
    >
      <div
        className={styles.cardHead}
        title="Drag to move"
        onPointerDown={(event) => {
          if ((event.target as HTMLElement).closest("button, select, input")) return;
          onMoveStart(event, widget.id);
        }}
      >
        <span className={styles.cardTitle}>{getDashboardWidgetTitle(widget)}</span>
        <button
          className={styles.cardX}
          title="Remove"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={() => onRemove(widget.id)}
        >
          ×
        </button>
      </div>
      <div className={mergeClassNames(styles.cardBody, catalogEntry.edgeToEdge && styles.flush)}>
        {renderDashboardWidget(widget, (updates) => onUpdate(widget.id, updates))}
      </div>
      {RESIZE_HANDLES.map((handle) => {
        const classSuffix = HANDLE_CLASS_SUFFIX[handle];
        return (
          <span
            key={handle}
            className={mergeClassNames(styles.handle, styles[`handle-${classSuffix}`])}
            data-handle={handle}
            onPointerDown={(event) => onResizeStart(event, widget.id, handle)}
          >
            <ResizeHandleGlyph handle={handle} />
          </span>
        );
      })}
    </div>
  );
}
