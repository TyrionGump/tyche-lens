import { MARKET_INDEX_FIXTURES } from "@/domain/market/index.ts";
import { PercentChangeBadge } from "@/shared/components/PercentChangeBadge.tsx";
import { SparklineChart } from "@/shared/components/charts/index.ts";
import { formatNumber } from "@/shared/utilities/numberFormatters.ts";

export function MarketIndicesWidget() {
  return (
    <div className="grid h-full grid-cols-[repeat(auto-fit,minmax(160px,1fr))] content-center gap-3.5">
      {MARKET_INDEX_FIXTURES.map((marketIndex) => (
        <div
          key={marketIndex.symbol}
          className="flex flex-col gap-1.25 border-r border-line pr-3.5 last:border-r-0"
        >
          <div className="text-caption font-bold text-dim">{marketIndex.name}</div>
          <div className="text-heading font-extrabold">
            {formatNumber(marketIndex.value, marketIndex.value > 100 ? 0 : 2)}
          </div>
          <div className="flex items-center justify-between gap-2">
            <PercentChangeBadge percentChange={marketIndex.changePercent} />
            <div className="h-6.5 w-14">
              <SparklineChart
                series={marketIndex.priceHistory}
                isPositiveChange={marketIndex.changePercent >= 0}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
