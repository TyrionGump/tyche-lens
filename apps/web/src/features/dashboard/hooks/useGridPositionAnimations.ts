import { useLayoutEffect, useRef } from "react";
import type { RefObject } from "react";
import type { DashboardGridInteraction } from "./useGridPointerInteractions.ts";

interface PixelPosition {
  left: number;
  top: number;
}

export function useGridPositionAnimations(
  gridElementRef: RefObject<HTMLDivElement | null>,
  activeInteraction: DashboardGridInteraction | null,
): void {
  const previousPositionsRef = useRef(new Map<string, PixelPosition>());
  const animationsRef = useRef(new Map<string, Animation>());

  useLayoutEffect(() => {
    const gridElement = gridElementRef.current;
    if (!gridElement) return;

    const visibleWidgetIds = new Set<string>();
    gridElement.querySelectorAll<HTMLElement>("[data-widget-id]").forEach((widgetElement) => {
      const widgetId = widgetElement.dataset.widgetId;
      if (!widgetId) return;

      visibleWidgetIds.add(widgetId);
      const left = widgetElement.offsetLeft;
      const top = widgetElement.offsetTop;
      const previousPosition = previousPositionsRef.current.get(widgetId);

      if (previousPosition && (previousPosition.left !== left || previousPosition.top !== top)) {
        // Preserve the current transform so rapid layout updates animate continuously.
        let inFlightOffsetX = 0;
        let inFlightOffsetY = 0;
        const currentTransform = getComputedStyle(widgetElement).transform;
        if (currentTransform && currentTransform !== "none") {
          const transformMatrix = new DOMMatrixReadOnly(currentTransform);
          inFlightOffsetX = transformMatrix.m41;
          inFlightOffsetY = transformMatrix.m42;
        }

        animationsRef.current.get(widgetId)?.cancel();
        const horizontalOffset = previousPosition.left - left + inFlightOffsetX;
        const verticalOffset = previousPosition.top - top + inFlightOffsetY;
        const isActiveWidget = activeInteraction?.widgetId === widgetId;
        const animation = widgetElement.animate(
          [
            { transform: `translate(${horizontalOffset}px, ${verticalOffset}px)` },
            { transform: "translate(0, 0)" },
          ],
          {
            duration: isActiveWidget ? 90 : 220,
            easing: "cubic-bezier(.2,.7,.3,1)",
          },
        );
        animationsRef.current.set(widgetId, animation);
      }

      previousPositionsRef.current.set(widgetId, { left, top });
    });

    for (const knownWidgetId of previousPositionsRef.current.keys()) {
      if (!visibleWidgetIds.has(knownWidgetId)) {
        previousPositionsRef.current.delete(knownWidgetId);
        animationsRef.current.get(knownWidgetId)?.cancel();
        animationsRef.current.delete(knownWidgetId);
      }
    }
  });

  useLayoutEffect(
    () => () => {
      animationsRef.current.forEach((animation) => animation.cancel());
      animationsRef.current.clear();
    },
    [],
  );
}
