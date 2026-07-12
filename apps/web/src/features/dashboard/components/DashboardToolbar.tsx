import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { usePortalContainer } from "@/shared/hooks/usePortalContainer.ts";
import { mergeClassNames } from "@/shared/utilities/mergeClassNames.ts";
import { DASHBOARD_DENSITY_METRICS } from "../model/dashboardDefaults.ts";
import type { DashboardDensity, DashboardWidgetType } from "../model/dashboardTypes.ts";
import { DASHBOARD_WIDGET_CATALOG, DASHBOARD_WIDGET_ORDER } from "../widgets/widgetCatalog.ts";
import { WidgetMenuIcon } from "../widgets/components/WidgetMenuIcon.tsx";

interface DashboardToolbarProps {
  density: DashboardDensity;
  onSetDensity: (density: DashboardDensity) => void;
  onAddWidget: (type: DashboardWidgetType) => void;
  onResetLayout: () => void;
}

const DENSITY_BUTTON_CLASS =
  "cursor-pointer rounded-full border-none bg-transparent px-3 py-1.5 text-label font-semibold whitespace-nowrap text-dim transition-all duration-120";

const MENU_ITEM_CLASS =
  "flex cursor-pointer flex-col items-start gap-1.75 rounded-control border border-transparent p-2.75 text-left text-body text-ink outline-none transition-colors duration-120 data-[highlighted]:border-accent/30 data-[highlighted]:bg-accent-soft";

export function DashboardToolbar({
  density,
  onSetDensity,
  onAddWidget,
  onResetLayout,
}: DashboardToolbarProps) {
  const portalContainer = usePortalContainer();

  return (
    <>
      <div
        className="flex rounded-full border border-border bg-bg p-0.75"
        role="group"
        aria-label="Card density"
      >
        {(Object.keys(DASHBOARD_DENSITY_METRICS) as DashboardDensity[]).map((densityOption) => (
          <button
            key={densityOption}
            type="button"
            aria-pressed={density === densityOption}
            className={mergeClassNames(
              DENSITY_BUTTON_CLASS,
              density === densityOption && "bg-card text-ink shadow-[var(--shadow)]",
            )}
            onClick={() => onSetDensity(densityOption)}
          >
            {DASHBOARD_DENSITY_METRICS[densityOption].label}
          </button>
        ))}
      </div>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger className="inline-flex cursor-pointer items-center gap-1.75 rounded-panel border-none bg-accent px-4 py-2.25 text-body font-bold text-white transition-[filter] duration-120 hover:brightness-108">
          <span className="text-base leading-none">＋</span> Add card
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal container={portalContainer ?? undefined}>
          <DropdownMenu.Content
            align="end"
            sideOffset={8}
            className="z-60 grid w-62 grid-cols-2 gap-1 rounded-panel border border-border bg-card p-1.75 shadow-[var(--shadow)]"
          >
            <DropdownMenu.Label className="col-span-2 px-2 pt-2 pb-1 text-caption font-bold tracking-wide text-faint uppercase">
              Add a card
            </DropdownMenu.Label>
            {DASHBOARD_WIDGET_ORDER.map((widgetType) => (
              <DropdownMenu.Item
                key={widgetType}
                className={MENU_ITEM_CLASS}
                onSelect={() => onAddWidget(widgetType)}
              >
                <WidgetMenuIcon widgetType={widgetType} />
                <span className="font-semibold">{DASHBOARD_WIDGET_CATALOG[widgetType].label}</span>
              </DropdownMenu.Item>
            ))}
            <DropdownMenu.Item
              className={mergeClassNames(
                MENU_ITEM_CLASS,
                "col-span-2 flex-row justify-center text-dim",
              )}
              onSelect={onResetLayout}
            >
              ↺ Reset to default layout
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </>
  );
}
