import { buildSparklineAreaPath, buildSparklinePath } from "@/shared/utilities/chartPaths.ts";

interface AreaChartProps {
  series: number[];
  isPositiveChange: boolean;
  width?: number;
  height?: number;
  fillOpacityPercent?: number;
  strokeWidth?: number;
  padding?: number;
}

export function AreaChart({
  series,
  isPositiveChange,
  width = 800,
  height = 320,
  fillOpacityPercent = 15,
  strokeWidth = 3,
  padding = 4,
}: AreaChartProps) {
  const color = isPositiveChange ? "var(--up)" : "var(--down)";
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: "block" }}
    >
      <path
        d={buildSparklineAreaPath(series, width, height, padding)}
        style={{ fill: `color-mix(in srgb, ${color} ${fillOpacityPercent}%, transparent)` }}
      />
      <path
        d={buildSparklinePath(series, width, height, padding)}
        fill="none"
        style={{ stroke: color }}
        strokeWidth={strokeWidth}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
