export interface MarketQuote {
  symbol: string;
  companyName: string;
  exchange: string;
  sector: string;
  lastPrice: number;
  priceChange: number;
  changePercent: number;
  openPrice: number;
  dayHigh: number;
  dayLow: number;
  previousClose: number;
  marketCapitalization: number;
  priceToEarningsRatio: number | null;
  dividendYieldPercent: number | null;
  tradingVolume: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  beta: number | null;
  earningsPerShare: number | null;
  description: string;
  priceHistory: number[];
  updatedAt: string | null;
}

export interface SymbolSearchResult {
  symbol: string;
  companyName: string;
  exchange: string;
  sector: string;
}

export interface MarketIndexQuote {
  name: string;
  symbol: string;
  value: number;
  changePercent: number;
  priceHistory: number[];
}

export interface MarketNewsItem {
  symbol: string;
  publishedAgo: string;
  source: string;
  title: string;
}

export interface PortfolioPosition {
  symbol: string;
  shareCount: number;
  averageCost: number;
}

export interface CalculatedPortfolioPosition extends PortfolioPosition {
  companyName: string;
  lastPrice: number;
  changePercent: number;
  marketValue: number;
  costBasis: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number;
  weightPercent: number;
  priceHistory: number[];
}

export interface PortfolioSummary {
  positions: CalculatedPortfolioPosition[];
  marketValue: number;
  costBasis: number;
  totalGain: number;
  totalGainPercent: number;
  dayChange: number;
  dayChangePercent: number;
}
