import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { MARKET_QUOTE_FIXTURES } from "@/domain/market";
import { DashboardWatchlistQuoteRow } from "./DashboardWatchlistQuoteRow.tsx";

const marketQuote = MARKET_QUOTE_FIXTURES.AAPL;

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, retryOnMount: false, refetchOnMount: false } },
  });
}

function renderRow(queryClient: QueryClient): string {
  return renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <DashboardWatchlistQuoteRow marketQuote={marketQuote} />
    </QueryClientProvider>,
  );
}

function registerHistoryQueryKey(queryClient: QueryClient): readonly unknown[] {
  renderRow(queryClient);
  const queries = queryClient.getQueryCache().getAll();
  if (queries.length !== 1) throw new Error("Expected one history query.");
  return queries[0].queryKey;
}

describe("DashboardWatchlistQuoteRow", () => {
  it("shows a focused loading state while history is pending", () => {
    expect(renderRow(createQueryClient())).toContain("Loading history…");
  });

  it("shows a focused history error without hiding quote data", async () => {
    const queryClient = createQueryClient();
    const historyQueryKey = registerHistoryQueryKey(queryClient);
    await queryClient.prefetchQuery({
      queryKey: historyQueryKey,
      queryFn: () => Promise.reject(new Error("History offline")),
    });

    const markup = renderRow(queryClient);

    expect(markup).toContain("History error");
    expect(markup).toContain(marketQuote.companyName);
  });

  it("distinguishes empty history from a successful sparkline", () => {
    const emptyHistoryClient = createQueryClient();
    emptyHistoryClient.setQueryData(registerHistoryQueryKey(emptyHistoryClient), []);
    expect(renderRow(emptyHistoryClient)).toContain("No history");

    const populatedHistoryClient = createQueryClient();
    populatedHistoryClient.setQueryData(
      registerHistoryQueryKey(populatedHistoryClient),
      [211.89, 214.52],
    );
    expect(renderRow(populatedHistoryClient)).toContain("<svg");
  });
});
