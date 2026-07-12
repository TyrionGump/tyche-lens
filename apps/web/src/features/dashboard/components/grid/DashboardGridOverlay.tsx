import { mergeClassNames } from "@/shared/utilities/mergeClassNames.ts";
import type { DashboardGridInteraction } from "../../hooks/useGridPointerInteractions.ts";
import styles from "./DashboardGrid.module.css";

interface DashboardGridOverlayProps {
  interaction: DashboardGridInteraction;
}

export function DashboardGridOverlay({ interaction }: DashboardGridOverlayProps) {
  const columnStride = interaction.columnContentWidth + interaction.gap;
  const rowStride = interaction.rowHeight + interaction.gap;

  return (
    <>
      <div
        className={styles.gridOverlay}
        style={{
          backgroundImage:
            `linear-gradient(to right, var(--dash-grid-cell) 0, var(--dash-grid-cell) ${interaction.columnContentWidth}px, transparent ${interaction.columnContentWidth}px),` +
            `linear-gradient(to bottom, var(--dash-grid-line) 0, var(--dash-grid-line) 1px, transparent 1px)`,
          backgroundSize: `${columnStride}px 100%, 100% ${rowStride}px`,
        }}
      />
      {interaction.kind === "resize" ? (
        <div
          className={styles.ghost}
          style={{
            left: interaction.column * columnStride,
            top: interaction.row * rowStride,
            width:
              interaction.columnSpan * interaction.columnContentWidth +
              (interaction.columnSpan - 1) * interaction.gap,
            height:
              interaction.rowSpan * interaction.rowHeight +
              (interaction.rowSpan - 1) * interaction.gap,
          }}
        >
          <span className={styles.ghostBadge}>
            {interaction.columnSpan} × {interaction.rowSpan}
          </span>
        </div>
      ) : (
        <span
          className={mergeClassNames(styles.ghostBadge, styles.badgeFloat)}
          style={{
            left: interaction.column * columnStride + 10,
            top: interaction.row * rowStride + 10,
          }}
        >
          {interaction.column + 1}, {interaction.row + 1}
        </span>
      )}
    </>
  );
}
