import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { clampNumber } from "@/shared/utilities/clampNumber.ts";

export interface RowReorderingState {
  symbol: string;
  offsetY: number;
  fromIndex: number;
  toIndex: number;
  rowStride: number;
}

const DRAG_LIFT_THRESHOLD = 4;
const DRAG_CLICK_GUARD_MS = 300;

export function useRowReordering(
  rowCount: number,
  onReorder: (fromIndex: number, toIndex: number) => void,
) {
  const [rowDrag, setRowDrag] = useState<RowReorderingState | null>(null);
  const rowCountRef = useRef(rowCount);
  rowCountRef.current = rowCount;
  const reorderRef = useRef(onReorder);
  reorderRef.current = onReorder;
  const removeWindowListenersRef = useRef<() => void>(() => undefined);

  // The trailing click after a completed drag must not open the stock detail panel.
  const lastCompletedDragAt = useRef(0);

  useEffect(
    () => () => {
      removeWindowListenersRef.current();
    },
    [],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent, rowIndex: number, symbol: string) => {
      if (event.button !== 0) return;
      event.preventDefault();

      const rowContainer = (event.currentTarget as HTMLElement).parentElement;
      if (!rowContainer) return;

      const rows = rowContainer.querySelectorAll("[data-row]");
      const rowStride =
        rows.length > 1
          ? Math.abs(rows[1].getBoundingClientRect().top - rows[0].getBoundingClientRect().top)
          : (event.currentTarget as HTMLElement).getBoundingClientRect().height;
      const gesture = {
        startY: event.clientY,
        fromIndex: rowIndex,
        toIndex: rowIndex,
        hasLifted: false,
      };

      const removeWindowListeners = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerEnd);
        window.removeEventListener("pointercancel", handlePointerEnd);
      };
      const handlePointerMove = (pointerEvent: PointerEvent) => {
        if (
          !gesture.hasLifted &&
          Math.abs(pointerEvent.clientY - gesture.startY) <= DRAG_LIFT_THRESHOLD
        ) {
          return;
        }

        gesture.hasLifted = true;
        const offsetY = clampNumber(
          pointerEvent.clientY - gesture.startY,
          -gesture.fromIndex * rowStride,
          (rowCountRef.current - 1 - gesture.fromIndex) * rowStride,
        );
        gesture.toIndex = clampNumber(
          gesture.fromIndex + Math.round(offsetY / rowStride),
          0,
          rowCountRef.current - 1,
        );
        setRowDrag({
          symbol,
          offsetY,
          fromIndex: gesture.fromIndex,
          toIndex: gesture.toIndex,
          rowStride,
        });
      };
      const handlePointerEnd = () => {
        removeWindowListeners();
        removeWindowListenersRef.current = () => undefined;
        if (gesture.hasLifted) lastCompletedDragAt.current = performance.now();
        if (gesture.toIndex !== gesture.fromIndex) {
          reorderRef.current(gesture.fromIndex, gesture.toIndex);
        }
        setRowDrag(null);
      };

      removeWindowListenersRef.current();
      removeWindowListenersRef.current = removeWindowListeners;
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerEnd);
      window.addEventListener("pointercancel", handlePointerEnd);
    },
    [],
  );

  return {
    rowDrag,
    shouldSuppressRowClick: () =>
      performance.now() - lastCompletedDragAt.current < DRAG_CLICK_GUARD_MS,
    getRowDragProps: (rowIndex: number, symbol: string) => ({
      onPointerDown: (event: ReactPointerEvent) => handlePointerDown(event, rowIndex, symbol),
    }),
  };
}
