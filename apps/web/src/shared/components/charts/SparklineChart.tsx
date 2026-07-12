import { buildSparklinePath } from "@/shared/utilities/chartPaths.ts";

interface SparklineChartProps {
  series: number[];
  isPositiveChange: boolean;
  strokeWidth?: number;
}

export function SparklineChart({ series, isPositiveChange, strokeWidth = 2 }: SparklineChartProps) {
  const width = 120;
  const height = 40;
  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      style={{ display: "block" }}
    >
      <path
        d={buildSparklinePath(series, width, height, 2)}
        fill="none"
        style={{ stroke: isPositiveChange ? "var(--up)" : "var(--down)" }}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
