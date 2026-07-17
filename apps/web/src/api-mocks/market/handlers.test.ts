import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { setupServer } from "msw/node";
import type {
  Error,
  HistoryResponse,
  QuotesResponse,
  SymbolsResponse,
} from "../../api/generated/models";
import {
  GetQuoteHistoryResponse,
  GetQuotesResponse,
  GetSymbolsResponse,
  getQuotesQuerySymbolsMax,
  getQuoteHistoryQueryPointsDefault,
  getQuoteHistoryQueryPointsMax,
  getQuoteHistoryQueryPointsMin,
} from "../../api/generated/validation.ts";
import type { MockScenario } from "../mockScenario.ts";
import { createMarketMockHandlers } from "./handlers.ts";

const ORIGIN = "http://localhost";
const FIXED_NOW = new Date("2026-07-15T09:30:00.000Z");
const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function useScenario(scenario: MockScenario, options: { slowDelayMs?: number } = {}): void {
  server.use(
    ...createMarketMockHandlers({
      scenario,
      now: () => FIXED_NOW,
      ...options,
    }),
  );
}

describe("market mock handlers", () => {
  it("normalizes valid quote symbols, preserves request order, and omits unknown symbols", async () => {
    useScenario("normal");

    const response = await fetch(`${ORIGIN}/v1/quotes?symbols=nvda,ZZZZ,AAPL`);
    const body = (await response.json()) as QuotesResponse;

    expect(response.status).toBe(200);
    expect(GetQuotesResponse.safeParse(body).success).toBe(true);
    expect(body.quotes.map((quote) => quote.symbol)).toEqual(["NVDA", "AAPL"]);
    expect(body.quotes.every((quote) => quote.asOf === FIXED_NOW.toISOString())).toBe(true);
  });

  it.each([
    ["/v1/quotes", "symbols is required"],
    ["/v1/quotes?symbols=", "symbols is required"],
    ["/v1/quotes?symbols=AAPL,!!", "invalid symbol"],
    ["/v1/quotes?symbols=AAPL,%20NVDA%20", "invalid symbol"],
    [
      `/v1/quotes?symbols=${Array.from({ length: getQuotesQuerySymbolsMax + 1 }, () => "A").join(",")}`,
      `at most ${getQuotesQuerySymbolsMax}`,
    ],
  ])("rejects an invalid quote request at %s", async (path, expectedMessage) => {
    useScenario("normal");

    const response = await fetch(`${ORIGIN}${path}`);
    const body = (await response.json()) as Error;

    expect(response.status).toBe(400);
    expect(body.code).toBe("invalid_request");
    expect(body.message).toContain(expectedMessage);
  });

  it("accepts the contract maximum number of quote symbols", async () => {
    useScenario("normal");
    const symbols = Array.from({ length: getQuotesQuerySymbolsMax }, () => "AAPL").join(",");

    const response = await fetch(`${ORIGIN}/v1/quotes?symbols=${symbols}`);
    const body = (await response.json()) as QuotesResponse;

    expect(response.status).toBe(200);
    expect(GetQuotesResponse.safeParse(body).success).toBe(true);
    expect(body.quotes).toHaveLength(getQuotesQuerySymbolsMax);
  });

  it("returns sorted symbol matches using symbol or company name", async () => {
    useScenario("normal");

    const catalogueResponse = await fetch(`${ORIGIN}/v1/symbols`);
    const catalogue = (await catalogueResponse.json()) as SymbolsResponse;
    const searchResponse = await fetch(`${ORIGIN}/v1/symbols?query=apple`);
    const search = (await searchResponse.json()) as SymbolsResponse;

    const symbols = catalogue.symbols.map((listing) => listing.symbol);
    expect(catalogueResponse.status).toBe(200);
    expect(GetSymbolsResponse.safeParse(catalogue).success).toBe(true);
    expect(GetSymbolsResponse.safeParse(search).success).toBe(true);
    expect(symbols).toEqual([...symbols].sort());
    expect(symbols.length).toBeLessThanOrEqual(20);
    expect(search.symbols.map((listing) => listing.symbol)).toEqual(["AAPL"]);
  });

  it("defaults and validates history point counts", async () => {
    useScenario("normal");

    const defaultResponse = await fetch(`${ORIGIN}/v1/quotes/aapl/history`);
    const defaultBody = (await defaultResponse.json()) as HistoryResponse;
    const minimumResponse = await fetch(
      `${ORIGIN}/v1/quotes/AAPL/history?points=${getQuoteHistoryQueryPointsMin}`,
    );
    const minimumBody = (await minimumResponse.json()) as HistoryResponse;
    const maximumResponse = await fetch(
      `${ORIGIN}/v1/quotes/AAPL/history?points=${getQuoteHistoryQueryPointsMax}`,
    );
    const maximumBody = (await maximumResponse.json()) as HistoryResponse;

    expect(defaultResponse.status).toBe(200);
    expect(GetQuoteHistoryResponse.safeParse(defaultBody).success).toBe(true);
    expect(GetQuoteHistoryResponse.safeParse(minimumBody).success).toBe(true);
    expect(GetQuoteHistoryResponse.safeParse(maximumBody).success).toBe(true);
    expect(defaultBody.symbol).toBe("AAPL");
    expect(defaultBody.points).toHaveLength(getQuoteHistoryQueryPointsDefault);
    expect(minimumResponse.status).toBe(200);
    expect(minimumBody.points).toHaveLength(getQuoteHistoryQueryPointsMin);
    expect(maximumResponse.status).toBe(200);
    expect(maximumBody.points).toHaveLength(getQuoteHistoryQueryPointsMax);

    for (const points of [
      String(getQuoteHistoryQueryPointsMin - 1),
      String(getQuoteHistoryQueryPointsMax + 1),
      "2.5",
      "2e2",
      "0x10",
      "abc",
    ]) {
      const response = await fetch(`${ORIGIN}/v1/quotes/AAPL/history?points=${points}`);
      const body = (await response.json()) as Error;
      expect(response.status).toBe(400);
      expect(body.code).toBe("invalid_request");
    }
  });

  it("distinguishes invalid and unknown history symbols", async () => {
    useScenario("normal");

    const invalidResponse = await fetch(`${ORIGIN}/v1/quotes/!!/history`);
    const invalidBody = (await invalidResponse.json()) as Error;
    const whitespaceResponse = await fetch(`${ORIGIN}/v1/quotes/%20AAPL%20/history`);
    const whitespaceBody = (await whitespaceResponse.json()) as Error;
    const unknownResponse = await fetch(`${ORIGIN}/v1/quotes/ZZZZ/history`);
    const unknownBody = (await unknownResponse.json()) as Error;

    expect(invalidResponse.status).toBe(400);
    expect(invalidBody.code).toBe("invalid_request");
    expect(whitespaceResponse.status).toBe(400);
    expect(whitespaceBody.code).toBe("invalid_request");
    expect(unknownResponse.status).toBe(404);
    expect(unknownBody.code).toBe("not_found");
  });

  it("returns contract-valid empty success bodies", async () => {
    useScenario("empty");

    const quotes = (await (
      await fetch(`${ORIGIN}/v1/quotes?symbols=AAPL`)
    ).json()) as QuotesResponse;
    const symbols = (await (await fetch(`${ORIGIN}/v1/symbols`)).json()) as SymbolsResponse;
    const historyResponse = await fetch(`${ORIGIN}/v1/quotes/ZZZZ/history?points=2`);
    const history = (await historyResponse.json()) as HistoryResponse;

    expect(GetQuotesResponse.safeParse(quotes).success).toBe(true);
    expect(GetSymbolsResponse.safeParse(symbols).success).toBe(true);
    expect(GetQuoteHistoryResponse.safeParse(history).success).toBe(true);
    expect(quotes.quotes).toEqual([]);
    expect(symbols.symbols).toEqual([]);
    expect(historyResponse.status).toBe(200);
    expect(history).toEqual({ symbol: "ZZZZ", points: [] });
  });

  it("returns documented failure statuses and still validates requests first", async () => {
    useScenario("error");

    const quoteResponse = await fetch(`${ORIGIN}/v1/quotes?symbols=AAPL`);
    const symbolResponse = await fetch(`${ORIGIN}/v1/symbols`);
    const historyResponse = await fetch(`${ORIGIN}/v1/quotes/ZZZZ/history`);
    const invalidResponse = await fetch(`${ORIGIN}/v1/quotes?symbols=!!`);
    const invalidBody = (await invalidResponse.json()) as Error;

    expect(quoteResponse.status).toBe(503);
    expect(symbolResponse.status).toBe(500);
    expect(historyResponse.status).toBe(503);
    expect(invalidResponse.status).toBe(400);
    expect(invalidBody.code).toBe("invalid_request");
  });

  it("delays before returning the normal response in the slow scenario", async () => {
    useScenario("slow", { slowDelayMs: 30 });
    const startedAt = performance.now();

    const response = await fetch(`${ORIGIN}/v1/quotes?symbols=AAPL`);
    const elapsedMilliseconds = performance.now() - startedAt;
    const body = (await response.json()) as QuotesResponse;

    expect(response.status).toBe(200);
    expect(GetQuotesResponse.safeParse(body).success).toBe(true);
    expect(body.quotes[0].symbol).toBe("AAPL");
    expect(elapsedMilliseconds).toBeGreaterThanOrEqual(20);
  });
});
