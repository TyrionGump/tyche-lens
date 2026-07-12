import { MARKET_QUOTE_FIXTURES } from "@/domain/market/index.ts";
import { PercentChangeBadge } from "@/shared/components/PercentChangeBadge.tsx";
import { SparklineChart } from "@/shared/components/charts/index.ts";

const MARKET_QUOTES_BY_CHANGE = Object.values(MARKET_QUOTE_FIXTURES).sort(
  (firstQuote, secondQuote) => secondQuote.changePercent - firstQuote.changePercent,
);

export function TopMoversWidget() {
  return (
    <div className="tl-noscrollbar flex h-full flex-col overflow-auto">
      {MARKET_QUOTES_BY_CHANGE.map((marketQuote) => (
        <div
          key={marketQuote.symbol}
          className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-t border-line px-0.5 py-2.75 first:border-t-0"
        >
          <div className="tl-strong">{marketQuote.symbol}</div>
          <div className="h-7">
            <SparklineChart
              series={marketQuote.priceHistory}
              isPositiveChange={marketQuote.changePercent >= 0}
            />
          </div>
          <PercentChangeBadge percentChange={marketQuote.changePercent} />
        </div>
      ))}
    </div>
  );
}
