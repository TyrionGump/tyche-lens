import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ComponentType } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { MarketQuote } from "@/domain/market";
import { PriceChartWidget } from "./PriceChartWidget.tsx";
import { StockQuoteWidget } from "./StockQuoteWidget.tsx";

const symbol = "AAPL";
const marketQuote: MarketQuote = {
  symbol,
  companyName: "Apple Inc.",
  exchange: "NASDAQ",
  sector: "Technology",
  lastPrice: 214.52,
  priceChange: 2.63,
  changePercent: 1.24,
  openPrice: 212.1,
  dayHigh: 215.3,
  dayLow: 211.75,
  previousClose: 211.89,
  marketCapitalization: 3_280_000_000_000,
  priceToEarningsRatio: 33.1,
  dividendYieldPercent: 0.44,
  tradingVolume: 48_200_000,
  fiftyTwoWeekHigh: 237.49,
  fiftyTwoWeekLow: 164.08,
  beta: 1.24,
  earningsPerShare: 6.49,
  description: "Apple designs consumer technology products.",
  priceHistory: [],
  updatedAt: "2026-07-11T00:00:00Z",
};

interface QueryWidgetProps {
  symbol: string;
  onSymbolChange: (nextSymbol: string) => void;
}

const queryWidgets: Array<{
  name: string;
  Component: ComponentType<QueryWidgetProps>;
  historyPointCount: number;
}> = [
  { name: "price chart", Component: PriceChartWidget, historyPointCount: 70 },
  { name: "stock quote", Component: StockQuoteWidget, historyPointCount: 40 },
];

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, retryOnMount: false, refetchOnMount: false } },
  });
}

function renderQueryWidget(
  Component: ComponentType<QueryWidgetProps>,
  queryClient: QueryClient,
): string {
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <Component symbol={symbol} onSymbolChange={() => undefined} />
    </QueryClientProvider>,
  );
}

function registerQueryKeys(
  Component: ComponentType<QueryWidgetProps>,
  queryClient: QueryClient,
  historyPointCount: number,
): { quoteQueryKey: readonly unknown[]; historyQueryKey: readonly unknown[] } {
  renderQueryWidget(Component, queryClient);
  const queries = queryClient.getQueryCache().getAll();
  const historyQuery = queries.find((query) => query.queryKey.at(-1) === historyPointCount);
  const quoteQuery = queries.find((query) => query !== historyQuery);
  if (!quoteQuery || !historyQuery || queries.length !== 2) {
    throw new Error("Expected one quote query and one history query.");
  }

  return { quoteQueryKey: quoteQuery.queryKey, historyQueryKey: historyQuery.queryKey };
}

describe.each(queryWidgets)("$name widget", ({ Component, historyPointCount }) => {
  it("keeps the symbol selector visible while market data loads", () => {
    const markup = renderQueryWidget(Component, createQueryClient());

    expect(markup).toContain('aria-label="Market symbol"');
  });

  it("preserves successful quote content when price history fails", async () => {
    const queryClient = createQueryClient();
    const { quoteQueryKey, historyQueryKey } = registerQueryKeys(
      Component,
      queryClient,
      historyPointCount,
    );
    queryClient.setQueryData(quoteQueryKey, { [symbol]: marketQuote });
    await queryClient.prefetchQuery({
      queryKey: historyQueryKey,
      queryFn: () => Promise.reject(new Error("History offline")),
    });

    const markup = renderQueryWidget(Component, queryClient);

    expect(markup).toContain('aria-label="Market symbol"');
    expect(markup).toContain("$214.52");
    expect(markup).toContain("Unable to load price history: History offline");
  });
});
