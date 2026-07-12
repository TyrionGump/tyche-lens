function formatFixedNumber(value: number, decimalPlaces: number, useGrouping: boolean): string {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimalPlaces,
    maximumFractionDigits: decimalPlaces,
    useGrouping,
  }).format(value);
}

export function formatCurrency(value: number, decimalPlaces = 2): string {
  return `$${formatFixedNumber(value, decimalPlaces, true)}`;
}

export function formatNumber(value: number, decimalPlaces = 2): string {
  return formatFixedNumber(value, decimalPlaces, true);
}

export function formatSignedPercent(value: number, decimalPlaces = 2): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${formatFixedNumber(value, decimalPlaces, false)}%`;
}

export function formatSignedNumber(value: number, decimalPlaces = 2): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${formatFixedNumber(value, decimalPlaces, true)}`;
}

const compactNumberFormatter = new Intl.NumberFormat("en-US", {
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCompactNumber(value: number): string {
  return compactNumberFormatter.format(value);
}
