import type { MarketQuote } from "@/domain/market";
import { clampNumber } from "@/shared/utilities/clampNumber.ts";
import { formatCurrency } from "@/shared/utilities/numberFormatters.ts";

interface PriceRangeBarProps {
  quote: MarketQuote;
  width?: number;
}

export function PriceRangeBar({ quote, width }: PriceRangeBarProps) {
  const priceRange = quote.fiftyTwoWeekHigh - quote.fiftyTwoWeekLow;
  const rawPosition =
    priceRange === 0 ? 50 : ((quote.lastPrice - quote.fiftyTwoWeekLow) / priceRange) * 100;
  const position = clampNumber(rawPosition, 2, 98);

  return (
    <span
      className="relative block h-1.25 w-full max-w-32.5 rounded-full bg-[color-mix(in_srgb,var(--ink)_10%,transparent)]"
      style={width ? { width } : undefined}
      title={`${formatCurrency(quote.fiftyTwoWeekLow)} – ${formatCurrency(quote.fiftyTwoWeekHigh)}`}
    >
      <i
        className="absolute top-1/2 h-2.75 w-2.75 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-accent"
        style={{ left: position + "%" }}
      />
    </span>
  );
}
