import {
  calculatePortfolio,
  MARKET_QUOTE_FIXTURES,
  PORTFOLIO_POSITION_FIXTURES,
} from "@/domain/market/index.ts";
import {
  formatCurrency,
  formatSignedNumber,
  formatSignedPercent,
} from "@/shared/utilities/numberFormatters.ts";

export function PortfolioValueWidget() {
  const portfolio = calculatePortfolio(PORTFOLIO_POSITION_FIXTURES, MARKET_QUOTE_FIXTURES);
  const statistics: Array<[label: string, value: string, suffix: string | null]> = [
    [
      "Total gain",
      formatSignedNumber(portfolio.totalGain),
      formatSignedPercent(portfolio.totalGainPercent),
    ],
    ["Cost basis", formatCurrency(portfolio.costBasis, 0), null],
    ["Positions", String(portfolio.positions.length), null],
  ];

  return (
    <div className="flex h-full flex-col bg-[linear-gradient(135deg,var(--accent)_0%,color-mix(in_srgb,var(--accent)_60%,#fff)_130%)] px-6 py-5.5 text-white">
      <div className="mb-2.25 text-body font-semibold opacity-90">Total portfolio value</div>
      <div className="text-[clamp(26px,4vw,40px)] leading-none font-extrabold tracking-tight">
        {formatCurrency(portfolio.marketValue, 2)}
      </div>
      <div className="mt-3 flex items-center gap-2.5">
        <span className="rounded-full bg-white/22 px-2.5 py-1 text-body font-bold">
          {formatSignedPercent(portfolio.dayChangePercent)} today
        </span>
        <span className="text-body opacity-92">{formatSignedNumber(portfolio.dayChange)}</span>
      </div>
      <div className="mt-auto flex flex-wrap gap-5.5 border-t border-white/20 pt-4.5">
        {statistics.map(([label, value, suffix]) => (
          <div key={label}>
            <div className="mb-1 text-label font-semibold opacity-85">{label}</div>
            <div className="text-title font-bold">
              {value}
              {suffix && (
                <span className="ml-1.5 text-label font-semibold opacity-90">{suffix}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
