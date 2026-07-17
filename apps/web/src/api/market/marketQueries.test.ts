import { QueryClient } from "@tanstack/react-query";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { setupServer } from "msw/node";
import { MARKET_QUOTE_FIXTURES } from "@/domain/market";
import type { MarketQuote, SymbolSearchResult } from "@/domain/market";
import { createMarketMockHandlers } from "../../api-mocks/market/handlers.ts";
import { fetchMarketHistory, fetchMarketQuotes, searchMarketSymbols } from "./marketApiClient.ts";
import {
  createMarketHistoryQueryOptions,
  createMarketQuotesQueryOptions,
  createMarketSymbolSearchQueryOptions,
} from "./marketQueries.ts";

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

const FIXED_NOW = new Date("2026-07-15T09:30:00.000Z");
const server = setupServer(
  ...createMarketMockHandlers({ scenario: "normal", now: () => FIXED_NOW }),
);
let interceptedFetch: typeof fetch;
let requestSignals: (AbortSignal | null | undefined)[];

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
  interceptedFetch = globalThis.fetch;
});

beforeEach(() => {
  requestSignals = [];
  vi.stubGlobal("fetch", (input: string | URL | Request, init?: RequestInit) => {
    requestSignals.push(init?.signal);
    const resolvedInput =
      typeof input === "string" && input.startsWith("/")
        ? new URL(input, "http://localhost")
        : input;
    return interceptedFetch(resolvedInput, init);
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  server.resetHandlers();
});

afterAll(() => server.close());

async function executeQuery<Result>(
  options: ExecutableQueryOptions,
  client: QueryClient,
  signal: AbortSignal,
): Promise<Result> {
  expect(options.queryFn).toBeTypeOf("function");
  const queryFunction = options.queryFn as (context: TestQueryContext) => Promise<Result>;
  return queryFunction({ client, queryKey: options.queryKey, signal, meta: undefined });
}

describe("market queries", () => {
  it("uses the generated client, shared handlers, and DTO adapter", async () => {
    const abortController = new AbortController();
    const queryClient = new QueryClient();

    const quotes = await executeQuery<Record<string, MarketQuote>>(
      createMarketQuotesQueryOptions(["NVDA", "AAPL"]),
      queryClient,
      abortController.signal,
    );
    const symbols = await executeQuery<SymbolSearchResult[]>(
      createMarketSymbolSearchQueryOptions(" apple "),
      queryClient,
      abortController.signal,
    );
    const history = await executeQuery<number[]>(
      createMarketHistoryQueryOptions("AAPL", 5),
      queryClient,
      abortController.signal,
    );

    expect(quotes.AAPL).toMatchObject({
      companyName: MARKET_QUOTE_FIXTURES.AAPL.companyName,
      updatedAt: FIXED_NOW.toISOString(),
    });
    expect(symbols).toEqual([
      expect.objectContaining({ symbol: "AAPL", companyName: "Apple Inc." }),
    ]);
    expect(history).toHaveLength(5);
    expect(history.at(-1)).toBe(MARKET_QUOTE_FIXTURES.AAPL.lastPrice);
    expect(requestSignals).toEqual([
      abortController.signal,
      abortController.signal,
      abortController.signal,
    ]);

    abortController.abort();
    expect(requestSignals.every((signal) => signal?.aborted)).toBe(true);
  });

  it("returns contract-valid empty results through the generated client", async () => {
    server.use(...createMarketMockHandlers({ scenario: "empty" }));

    await expect(fetchMarketQuotes(["AAPL"])).resolves.toEqual({});
    await expect(searchMarketSymbols("apple")).resolves.toEqual([]);
    await expect(fetchMarketHistory("ZZZZ", 5)).resolves.toEqual([]);
  });

  it("turns documented API failures into Error instances", async () => {
    server.use(...createMarketMockHandlers({ scenario: "error" }));

    await expect(fetchMarketQuotes(["AAPL"])).rejects.toEqual(
      new Error("Quote source is unavailable"),
    );
    await expect(searchMarketSymbols("apple")).rejects.toEqual(
      new Error("Symbol search is unavailable"),
    );
    await expect(fetchMarketHistory("ZZZZ", 5)).rejects.toEqual(
      new Error("Quote history source is unavailable"),
    );
  });

  it("uses the slow scenario through the generated client", async () => {
    server.use(...createMarketMockHandlers({ scenario: "slow", slowDelayMs: 30 }));
    const startedAt = performance.now();

    await expect(fetchMarketQuotes(["AAPL"])).resolves.toHaveProperty("AAPL");
    expect(performance.now() - startedAt).toBeGreaterThanOrEqual(20);
  });

  it("preserves native abort errors", async () => {
    server.use(...createMarketMockHandlers({ scenario: "slow", slowDelayMs: 1_000 }));
    const abortController = new AbortController();

    const request = fetchMarketQuotes(["AAPL"], abortController.signal);
    abortController.abort();

    await expect(request).rejects.toMatchObject({ name: "AbortError" });
  });

  it("normalizes non-object network failures", async () => {
    vi.stubGlobal("fetch", () => Promise.reject("offline"));

    await expect(fetchMarketQuotes(["AAPL"])).rejects.toEqual(
      new Error("Market data request failed"),
    );
  });
});
