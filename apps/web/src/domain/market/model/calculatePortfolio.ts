import type {
  CalculatedPortfolioPosition,
  MarketQuote,
  PortfolioPosition,
  PortfolioSummary,
} from "./marketTypes.ts";

export function calculatePortfolio(
  positions: readonly PortfolioPosition[],
  quotesBySymbol: Readonly<Record<string, MarketQuote>>,
): PortfolioSummary {
  const calculatedPositions: CalculatedPortfolioPosition[] = positions.map((position) => {
    const quote = quotesBySymbol[position.symbol];
    if (!quote) {
      throw new Error(`Missing market quote for ${position.symbol}`);
    }

    const marketValue = quote.lastPrice * position.shareCount;
    const costBasis = position.averageCost * position.shareCount;
    const totalGain = marketValue - costBasis;

    return {
      ...position,
      companyName: quote.companyName,
      lastPrice: quote.lastPrice,
      changePercent: quote.changePercent,
      marketValue,
      costBasis,
      totalGain,
      totalGainPercent: costBasis === 0 ? 0 : (totalGain / costBasis) * 100,
      dayChange: quote.priceChange * position.shareCount,
      weightPercent: 0,
      priceHistory: quote.priceHistory,
    };
  });

  const marketValue = calculatedPositions.reduce(
    (total, position) => total + position.marketValue,
    0,
  );
  const costBasis = calculatedPositions.reduce((total, position) => total + position.costBasis, 0);
  const dayChange = calculatedPositions.reduce((total, position) => total + position.dayChange, 0);

  for (const position of calculatedPositions) {
    position.weightPercent = marketValue === 0 ? 0 : (position.marketValue / marketValue) * 100;
  }

  const totalGain = marketValue - costBasis;
  const previousMarketValue = marketValue - dayChange;

  return {
    positions: calculatedPositions,
    marketValue,
    costBasis,
    totalGain,
    totalGainPercent: costBasis === 0 ? 0 : (totalGain / costBasis) * 100,
    dayChange,
    dayChangePercent: previousMarketValue === 0 ? 0 : (dayChange / previousMarketValue) * 100,
  };
}
