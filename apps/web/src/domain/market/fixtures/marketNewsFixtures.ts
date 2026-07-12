import type { MarketNewsItem } from "../model/marketTypes.ts";

export const MARKET_NEWS_FIXTURES: MarketNewsItem[] = [
  {
    symbol: "NVDA",
    publishedAgo: "2h",
    source: "Reuters",
    title: "NVIDIA unveils next-gen accelerator as data-center demand stays red-hot",
  },
  {
    symbol: "AAPL",
    publishedAgo: "4h",
    source: "Bloomberg",
    title: "Apple expands on-device AI features across its product line",
  },
  {
    symbol: "TSLA",
    publishedAgo: "6h",
    source: "WSJ",
    title: "Tesla deliveries slip in Europe as competition intensifies",
  },
  {
    symbol: "MSFT",
    publishedAgo: "9h",
    source: "CNBC",
    title: "Microsoft cloud revenue tops estimates on AI services growth",
  },
];
