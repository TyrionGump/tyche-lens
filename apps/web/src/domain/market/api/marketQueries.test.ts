import { QueryClient } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";

const NativeRequest = globalThis.Request;

class LocalRequest extends NativeRequest {
  constructor(input: RequestInfo | URL, init?: RequestInit) {
    const resolvedInput =
      typeof input === "string" && input.startsWith("/")
        ? new URL(input, "http://localhost")
        : input;
    super(resolvedInput, init);
  }
}

const apiQuote = {
  symbol: "AAPL",
  name: "Apple Inc.",
  exchange: "NASDAQ",
  sector: "Technology",
  price: 214.52,
  changePct: 1.24,
  changeAbs: 2.63,
  open: 212.1,
  high: 215.3,
  low: 211.75,
  prevClose: 211.89,
  marketCap: 3_280_000_000_000,
  peRatio: 33.1,
  divYield: 0.44,
  volume: 48_200_000,
  week52High: 237.49,
  week52Low: 164.08,
  beta: 1.24,
  eps: 6.49,
  asOf: "2026-07-11T00:00:00Z",
};

interface ExecutableQueryOptions {
  queryKey: readonly unknown[];
  queryFn?: unknown;
}

interface TestQueryContext {
  client: QueryClient;
  queryKey: readonly unknown[];
  signal: AbortSignal;
  meta: Record<string, unknown> | undefined;
}

async function executeQuery(
  options: ExecutableQueryOptions,
  client: QueryClient,
  signal: AbortSignal,
): Promise<void> {
  expect(options.queryFn).toBeTypeOf("function");
  const queryFunction = options.queryFn as (context: TestQueryContext) => Promise<unknown>;
  await queryFunction({ client, queryKey: options.queryKey, signal, meta: undefined });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetModules();
});

describe("market query cancellation", () => {
  it("passes the query AbortSignal through every market request", async () => {
    const requests: Request[] = [];
    const fetchMock = vi.fn(async (request: Request) => {
      requests.push(request);
      const { pathname } = new URL(request.url);
      const responseBody =
        pathname === "/v1/quotes"
          ? { quotes: [apiQuote] }
          : pathname === "/v1/symbols"
            ? {
                symbols: [
                  {
                    symbol: apiQuote.symbol,
                    name: apiQuote.name,
                    exchange: apiQuote.exchange,
                    sector: apiQuote.sector,
                  },
                ],
              }
            : { symbol: apiQuote.symbol, points: [211.89, 214.52] };

      return new Response(JSON.stringify(responseBody), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    });
    vi.stubGlobal("Request", LocalRequest);
    vi.stubGlobal("fetch", fetchMock);

    const {
      createMarketHistoryQueryOptions,
      createMarketQuotesQueryOptions,
      createMarketSymbolSearchQueryOptions,
    } = await import("./marketQueries.ts");
    const abortController = new AbortController();
    const queryClient = new QueryClient();

    await executeQuery(
      createMarketQuotesQueryOptions([apiQuote.symbol]),
      queryClient,
      abortController.signal,
    );
    await executeQuery(
      createMarketSymbolSearchQueryOptions(apiQuote.symbol),
      queryClient,
      abortController.signal,
    );
    await executeQuery(
      createMarketHistoryQueryOptions(apiQuote.symbol, 2),
      queryClient,
      abortController.signal,
    );

    expect(requests).toHaveLength(3);
    abortController.abort();
    expect(requests.map((request) => request.signal.aborted)).toEqual([true, true, true]);
  });
});
