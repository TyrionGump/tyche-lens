import { useRef } from "react";
import type { Dispatch, SetStateAction } from "react";
import { useGridPointerInteractions } from "../../hooks/useGridPointerInteractions.ts";
import { useGridPositionAnimations } from "../../hooks/useGridPositionAnimations.ts";
import type { DashboardDensityMetrics, DashboardWidgetLayout } from "../../model/dashboardTypes.ts";
import styles from "./DashboardGrid.module.css";
import { DashboardGridOverlay } from "./DashboardGridOverlay.tsx";
import { DashboardWidgetCard } from "./DashboardWidgetCard.tsx";

interface DashboardGridProps {
  widgets: DashboardWidgetLayout[];
  setWidgets: Dispatch<SetStateAction<DashboardWidgetLayout[]>>;
  densityMetrics: DashboardDensityMetrics;
}

export function DashboardGrid({ widgets, setWidgets, densityMetrics }: DashboardGridProps) {
  const gridElementRef = useRef<HTMLDivElement>(null);
  const { activeInteraction, handleMoveStart, handleResizeStart } = useGridPointerInteractions({
    gridElementRef,
    widgets,
    setWidgets,
    densityMetrics,
  });
  useGridPositionAnimations(gridElementRef, activeInteraction);

  const removeWidget = (widgetId: string) => {
    setWidgets((currentWidgets) => currentWidgets.filter((widget) => widget.id !== widgetId));
  };
  const updateWidget = (widgetId: string, updates: Partial<DashboardWidgetLayout>) => {
    setWidgets((currentWidgets) =>
      currentWidgets.map((widget) => (widget.id === widgetId ? { ...widget, ...updates } : widget)),
    );
  };

  return (
    <div className={styles.grid} ref={gridElementRef}>
      {widgets.length === 0 && (
        <div className={styles.empty} style={{ gridColumn: "1 / -1" }}>
          <b>Your dashboard is empty</b>
          Use “+ Add card” to start building your layout.
        </div>
      )}
      {widgets.map((widget) => (
        <DashboardWidgetCard
          key={widget.id}
          widget={widget}
          isDragging={
            activeInteraction?.kind === "move" && activeInteraction.widgetId === widget.id
          }
          isResizing={
            activeInteraction?.kind === "resize" && activeInteraction.widgetId === widget.id
          }
          onRemove={removeWidget}
          onUpdate={updateWidget}
          onResizeStart={handleResizeStart}
          onMoveStart={handleMoveStart}
        />
      ))}
      {activeInteraction && <DashboardGridOverlay interaction={activeInteraction} />}
    </div>
  );
}
