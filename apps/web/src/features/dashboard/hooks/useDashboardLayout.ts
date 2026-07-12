import { useCallback, useEffect, useState } from "react";
import {
  createDefaultDashboardState,
  DASHBOARD_DENSITY_METRICS,
} from "../model/dashboardDefaults.ts";
import { findAvailablePosition } from "../model/gridLayout.ts";
import {
  acquireDashboardStorage,
  loadDashboardState,
  saveDashboardState,
} from "../model/dashboardStorage.ts";
import type { DashboardDensity, DashboardWidgetType } from "../model/dashboardTypes.ts";
import { DASHBOARD_WIDGET_CATALOG } from "../widgets/widgetCatalog.ts";

export function useDashboardLayout() {
  const [storage] = useState(() => acquireDashboardStorage());
  const [initialState] = useState(
    () => loadDashboardState(storage) ?? createDefaultDashboardState(),
  );
  const [density, setDensity] = useState<DashboardDensity>(initialState.density);
  const [widgets, setWidgets] = useState(initialState.widgets);

  useEffect(() => {
    saveDashboardState({ density, widgets }, storage);
  }, [density, storage, widgets]);

  const addWidget = useCallback((type: DashboardWidgetType) => {
    const catalogEntry = DASHBOARD_WIDGET_CATALOG[type];
    setWidgets((currentWidgets) => {
      const position = findAvailablePosition(
        currentWidgets,
        catalogEntry.defaultSpan.columnSpan,
        catalogEntry.defaultSpan.rowSpan,
      );
      return [
        ...currentWidgets,
        {
          id: crypto.randomUUID(),
          type,
          ...position,
          ...catalogEntry.defaultSpan,
          ...catalogEntry.initialState,
        },
      ];
    });
  }, []);

  const resetLayout = useCallback(() => {
    setWidgets(createDefaultDashboardState().widgets);
  }, []);

  return {
    density,
    setDensity,
    densityMetrics: DASHBOARD_DENSITY_METRICS[density],
    widgets,
    setWidgets,
    addWidget,
    resetLayout,
  };
}
