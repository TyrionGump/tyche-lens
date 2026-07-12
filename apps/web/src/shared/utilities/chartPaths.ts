export function buildSparklinePath(
  series: number[],
  width: number,
  height: number,
  padding = 2,
): string {
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = max - min || 1;
  const stepX = (width - padding * 2) / (series.length - 1);

  return series
    .map((value, index) => {
      const x = padding + index * stepX;
      const y = padding + (height - padding * 2) * (1 - (value - min) / range);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function buildSparklineAreaPath(
  series: number[],
  width: number,
  height: number,
  padding = 2,
): string {
  const line = buildSparklinePath(series, width, height, padding);
  return `${line} L${(width - padding).toFixed(2)},${height} L${padding},${height} Z`;
}
