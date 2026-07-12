import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { clampNumber } from "@/shared/utilities/clampNumber.ts";

export interface ColumnReorderingState {
  metricId: string;
  offsetX: number;
  fromIndex: number;
  toIndex: number;
  columnStride: number;
  ghost: { left: number; width: number };
}

export function useColumnReordering(
  columnCount: number,
  onReorder: (fromIndex: number, toIndex: number) => void,
) {
  const [columnDrag, setColumnDrag] = useState<ColumnReorderingState | null>(null);
  const columnCountRef = useRef(columnCount);
  columnCountRef.current = columnCount;
  const reorderRef = useRef(onReorder);
  reorderRef.current = onReorder;
  const removeWindowListenersRef = useRef<() => void>(() => undefined);

  useEffect(
    () => () => {
      removeWindowListenersRef.current();
    },
    [],
  );

  const handlePointerDown = useCallback(
    (event: ReactPointerEvent, columnIndex: number, metricId: string) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();

      const header = event.currentTarget as HTMLElement;
      const headerRow = header.parentElement;
      const board = header.closest<HTMLElement>("[data-board]");
      if (!headerRow || !board) return;

      const headers = headerRow.querySelectorAll("[data-col]");
      const columnStride =
        headers.length > 1
          ? Math.abs(
              headers[1].getBoundingClientRect().left - headers[0].getBoundingClientRect().left,
            )
          : header.getBoundingClientRect().width + 12;
      const boardRectangle = board.getBoundingClientRect();
      const headerRectangle = header.getBoundingClientRect();
      const ghost = {
        left: headerRectangle.left - boardRectangle.left + board.scrollLeft,
        width: headerRectangle.width,
      };
      const gesture = {
        startX: event.clientX,
        fromIndex: columnIndex,
        toIndex: columnIndex,
      };

      const removeWindowListeners = () => {
        window.removeEventListener("pointermove", handlePointerMove);
        window.removeEventListener("pointerup", handlePointerEnd);
        window.removeEventListener("pointercancel", handlePointerEnd);
      };
      const handlePointerMove = (pointerEvent: PointerEvent) => {
        // Keep reorderable metrics inside their zone; fixed identity columns cannot be crossed.
        const offsetX = clampNumber(
          pointerEvent.clientX - gesture.startX,
          -gesture.fromIndex * columnStride,
          (columnCountRef.current - 1 - gesture.fromIndex) * columnStride,
        );
        gesture.toIndex = clampNumber(
          gesture.fromIndex + Math.round(offsetX / columnStride),
          0,
          columnCountRef.current - 1,
        );
        setColumnDrag({
          metricId,
          offsetX,
          fromIndex: gesture.fromIndex,
          toIndex: gesture.toIndex,
          columnStride,
          ghost,
        });
      };
      const handlePointerEnd = () => {
        removeWindowListeners();
        removeWindowListenersRef.current = () => undefined;
        if (gesture.toIndex !== gesture.fromIndex) {
          reorderRef.current(gesture.fromIndex, gesture.toIndex);
        }
        setColumnDrag(null);
      };

      removeWindowListenersRef.current();
      removeWindowListenersRef.current = removeWindowListeners;
      window.addEventListener("pointermove", handlePointerMove);
      window.addEventListener("pointerup", handlePointerEnd);
      window.addEventListener("pointercancel", handlePointerEnd);
      setColumnDrag({
        metricId,
        offsetX: 0,
        fromIndex: columnIndex,
        toIndex: columnIndex,
        columnStride,
        ghost,
      });
    },
    [],
  );

  return {
    columnDrag,
    getColumnDragProps: (columnIndex: number, metricId: string) => ({
      onPointerDown: (event: ReactPointerEvent) => handlePointerDown(event, columnIndex, metricId),
    }),
  };
}
