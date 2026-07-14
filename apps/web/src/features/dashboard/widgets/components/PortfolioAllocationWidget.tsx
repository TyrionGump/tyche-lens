import {
  calculatePortfolio,
  MARKET_QUOTE_FIXTURES,
  PORTFOLIO_POSITION_FIXTURES,
} from "@/domain/market";

export function PortfolioAllocationWidget() {
  const { positions } = calculatePortfolio(PORTFOLIO_POSITION_FIXTURES, MARKET_QUOTE_FIXTURES);

  return (
    <div className="tl-noscrollbar h-full overflow-auto">
      {positions.map((position, index) => (
        <div key={position.symbol} className="mb-3.75">
          <div className="mb-1.75 flex justify-between text-body">
            <span className="tl-strong">{position.symbol}</span>
            <span className="tl-muted">{position.weightPercent.toFixed(1)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${position.weightPercent}%`, opacity: 0.95 - index * 0.13 }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
