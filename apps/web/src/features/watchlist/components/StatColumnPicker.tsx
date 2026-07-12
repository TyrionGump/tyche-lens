import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { usePortalContainer } from "@/shared/hooks/usePortalContainer.ts";
import { mergeClassNames } from "@/shared/utilities/mergeClassNames.ts";
import { MAX_VISIBLE_METRICS, WATCHLIST_METRICS } from "../model/stockMetrics.ts";

interface StatColumnPickerProps {
  visibleMetricIds: string[];
  onChangeVisibleMetricIds: (metricIds: string[]) => void;
}

const metricRowClassName =
  "group flex cursor-pointer items-center gap-2.5 rounded-control px-2.5 py-1.75 text-left text-body font-semibold text-ink outline-none transition-colors duration-120 data-[highlighted]:bg-accent-soft data-[disabled]:cursor-default data-[disabled]:opacity-45";

export function StatColumnPicker({
  visibleMetricIds,
  onChangeVisibleMetricIds,
}: StatColumnPickerProps) {
  const portalContainer = usePortalContainer();

  const handleToggleMetric = (metricId: string) => {
    if (visibleMetricIds.includes(metricId)) {
      onChangeVisibleMetricIds(visibleMetricIds.filter((id) => id !== metricId));
    } else if (visibleMetricIds.length < MAX_VISIBLE_METRICS) {
      onChangeVisibleMetricIds([...visibleMetricIds, metricId]);
    }
  };

  const canonicalMetricIds = WATCHLIST_METRICS.filter((metric) =>
    visibleMetricIds.includes(metric.id),
  ).map((metric) => metric.id);
  const isCanonicalOrder = canonicalMetricIds.join() === visibleMetricIds.join();

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger className="inline-flex cursor-pointer items-center gap-1.75 rounded-panel border border-border bg-card px-3.5 py-2.25 text-body font-semibold text-ink transition-[border-color,box-shadow] duration-120 hover:border-[color-mix(in_srgb,var(--accent)_45%,var(--border))] data-[state=open]:border-accent data-[state=open]:shadow-[0_0_0_3px_var(--accent-soft)]">
        ⚙ Stats{" "}
        <span className="rounded-full bg-chip px-1.75 py-px text-caption font-extrabold text-faint">
          {visibleMetricIds.length}
        </span>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal container={portalContainer ?? undefined}>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-60 flex w-56 flex-col gap-0.5 rounded-panel border border-border bg-card p-1.5 shadow-[var(--shadow)]"
        >
          <DropdownMenu.Label className="flex items-baseline justify-between gap-2 px-2.5 pt-2 pb-1.5 text-label font-bold">
            Table columns{" "}
            <span className="text-xs text-faint">
              {visibleMetricIds.length} of {MAX_VISIBLE_METRICS}
            </span>
          </DropdownMenu.Label>
          {WATCHLIST_METRICS.map((metric) => {
            const isSelected = visibleMetricIds.includes(metric.id);
            const isAtLimit = !isSelected && visibleMetricIds.length >= MAX_VISIBLE_METRICS;
            return (
              <DropdownMenu.CheckboxItem
                key={metric.id}
                checked={isSelected}
                disabled={isAtLimit}
                onSelect={(event) => event.preventDefault()}
                onCheckedChange={() => handleToggleMetric(metric.id)}
                className={metricRowClassName}
              >
                <span className="flex size-4.25 flex-none items-center justify-center rounded-chip border-[1.5px] border-faint bg-card text-micro font-extrabold text-white transition-all duration-120 group-data-[state=checked]:border-accent group-data-[state=checked]:bg-accent">
                  <DropdownMenu.ItemIndicator>✓</DropdownMenu.ItemIndicator>
                </span>
                {metric.label}
              </DropdownMenu.CheckboxItem>
            );
          })}
          {!isCanonicalOrder && (
            <DropdownMenu.Item
              className="mt-1 block w-full cursor-pointer border-t border-line px-2.5 py-1.75 text-left text-label font-semibold text-accent outline-none transition-colors duration-120 data-[highlighted]:bg-accent-soft"
              onSelect={() => onChangeVisibleMetricIds(canonicalMetricIds)}
            >
              ↺ Reset column order
            </DropdownMenu.Item>
          )}
          <div
            className={mergeClassNames(
              "px-2.5 pb-1.25 text-caption text-faint",
              isCanonicalOrder ? "mt-1 border-t border-line pt-1.75" : "pt-0.5",
            )}
          >
            Drag column headers to reorder · saved per list · price &amp; change always shown
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
