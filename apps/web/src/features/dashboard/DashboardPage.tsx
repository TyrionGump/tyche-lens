import type { CSSProperties, ReactElement } from "react";
import { PageHeader } from "@/shared/components/layout/PageHeader.tsx";
import { DashboardToolbar } from "./components/DashboardToolbar.tsx";
import { DashboardGrid } from "./components/grid/DashboardGrid.tsx";
import { useDashboardLayout } from "./hooks/useDashboardLayout.ts";

export function DashboardPage(): ReactElement {
  const { density, setDensity, densityMetrics, widgets, setWidgets, addWidget, resetLayout } =
    useDashboardLayout();

  const dashboardStyle = {
    "--gap": `${densityMetrics.gap}px`,
    "--row": `${densityMetrics.rowHeight}px`,
    "--cardpad": `${densityMetrics.cardPadding}px`,
  } as CSSProperties;

  return (
    <div className="flex flex-col" style={dashboardStyle}>
      <PageHeader
        actions={
          <DashboardToolbar
            density={density}
            onSetDensity={setDensity}
            onAddWidget={addWidget}
            onResetLayout={resetLayout}
          />
        }
      />
      <div className="px-6.5 pt-4.5 pb-20">
        <DashboardGrid widgets={widgets} setWidgets={setWidgets} densityMetrics={densityMetrics} />
      </div>
    </div>
  );
}
