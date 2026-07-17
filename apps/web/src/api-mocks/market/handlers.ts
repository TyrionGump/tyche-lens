import { delay, HttpResponse, http } from "msw";
import type { RequestHandler } from "msw";
import {
  GetQuoteHistoryParams,
  GetQuoteHistoryQueryParams,
  GetQuotesQueryParams,
  GetSymbolsQueryParams,
  getQuotesQuerySymbolsMax,
  getQuoteHistoryQueryPointsMax,
  getQuoteHistoryQueryPointsMin,
} from "../../api/generated/validation.ts";
import type { MockScenario } from "../mockScenario.ts";
import { normalizeMarketSymbol } from "./catalog.ts";
import {
  createEmptyMockHistoryResponse,
  createEmptyMockQuotesResponse,
  createEmptyMockSymbolsResponse,
  createMockHistoryBadRequest,
  createMockHistoryResponse,
  createMockHistoryNotFound,
  createMockHistoryUnavailableResponse,
  createMockQuotesBadRequest,
  createMockQuotesResponse,
  createMockQuotesUnavailableResponse,
  createMockSymbolsBadRequest,
  createMockSymbolsResponse,
  createMockSymbolsUnavailableResponse,
} from "./responses.ts";

// The generated numeric bounds accept fractions, so preserve OpenAPI integer syntax first.
const DECIMAL_INTEGER_PATTERN = /^\d+$/;
const DEFAULT_SLOW_DELAY_MS = 1_500;

export interface MarketMockHandlerOptions {
  scenario: MockScenario;
  now?: () => Date;
  slowDelayMs?: number;
}

function invalidQuoteRequest(message: string) {
  return HttpResponse.json(createMockQuotesBadRequest(message), { status: 400 });
}

function invalidHistoryRequest(message: string) {
  return HttpResponse.json(createMockHistoryBadRequest(message), { status: 400 });
}

function normalizeValidSymbol(rawSymbol: string): string | undefined {
  const parsedPath = GetQuoteHistoryParams.safeParse({ symbol: rawSymbol });
  return parsedPath.success ? normalizeMarketSymbol(parsedPath.data.symbol) : undefined;
}

async function applySlowScenario(scenario: MockScenario, slowDelayMs: number): Promise<void> {
  if (scenario === "slow") await delay(slowDelayMs);
}

export function createMarketMockHandlers({
  scenario,
  now = () => new Date(),
  slowDelayMs = DEFAULT_SLOW_DELAY_MS,
}: MarketMockHandlerOptions): RequestHandler[] {
  return [
    http.get("*/v1/quotes", async ({ request }) => {
      const rawSymbols = new URL(request.url).searchParams.get("symbols");
      if (!rawSymbols) return invalidQuoteRequest("symbols is required");

      const symbolParts = rawSymbols.split(",");
      if (symbolParts.length > getQuotesQuerySymbolsMax) {
        return invalidQuoteRequest(`at most ${getQuotesQuerySymbolsMax} symbols per request`);
      }

      const parsedQuery = GetQuotesQueryParams.safeParse({
        symbols: symbolParts,
      });
      if (!parsedQuery.success) {
        const invalidSymbolIndex = parsedQuery.error.issues
          .map((issue) => issue.path[1])
          .find((pathPart): pathPart is number => typeof pathPart === "number");
        const invalidSymbol =
          invalidSymbolIndex === undefined ? rawSymbols : symbolParts[invalidSymbolIndex];
        return invalidQuoteRequest(`invalid symbol "${invalidSymbol}"`);
      }
      const symbols = parsedQuery.data.symbols.map(normalizeMarketSymbol);

      if (scenario === "error") {
        return HttpResponse.json(createMockQuotesUnavailableResponse(), { status: 503 });
      }

      await applySlowScenario(scenario, slowDelayMs);
      if (scenario === "empty") {
        return HttpResponse.json(createEmptyMockQuotesResponse(), { status: 200 });
      }

      return HttpResponse.json(createMockQuotesResponse(symbols, now().toISOString()), {
        status: 200,
      });
    }),

    http.get("*/v1/symbols", async ({ request }) => {
      const rawQuery = new URL(request.url).searchParams.get("query");
      const parsedQuery = GetSymbolsQueryParams.safeParse(
        rawQuery === null ? {} : { query: rawQuery },
      );
      if (!parsedQuery.success) {
        return HttpResponse.json(createMockSymbolsBadRequest("invalid symbol search query"), {
          status: 400,
        });
      }

      if (scenario === "error") {
        return HttpResponse.json(createMockSymbolsUnavailableResponse(), { status: 500 });
      }

      await applySlowScenario(scenario, slowDelayMs);
      if (scenario === "empty") {
        return HttpResponse.json(createEmptyMockSymbolsResponse(), { status: 200 });
      }

      const query = parsedQuery.data.query ?? "";
      return HttpResponse.json(createMockSymbolsResponse(query), { status: 200 });
    }),

    http.get("*/v1/quotes/:symbol/history", async ({ params, request }) => {
      const rawSymbol = String(params.symbol ?? "");
      const symbol = normalizeValidSymbol(rawSymbol);
      if (!symbol) return invalidHistoryRequest(`invalid symbol "${rawSymbol}"`);

      const rawPoints = new URL(request.url).searchParams.get("points");
      const parsedQuery = GetQuoteHistoryQueryParams.safeParse(
        rawPoints === null
          ? {}
          : {
              points: DECIMAL_INTEGER_PATTERN.test(rawPoints) ? Number(rawPoints) : Number.NaN,
            },
      );
      if (!parsedQuery.success) {
        return invalidHistoryRequest(
          `points must be between ${getQuoteHistoryQueryPointsMin} and ${getQuoteHistoryQueryPointsMax}`,
        );
      }
      const { points: pointCount } = parsedQuery.data;

      if (scenario === "error") {
        return HttpResponse.json(createMockHistoryUnavailableResponse(), { status: 503 });
      }

      await applySlowScenario(scenario, slowDelayMs);
      if (scenario === "empty") {
        return HttpResponse.json(createEmptyMockHistoryResponse(symbol), { status: 200 });
      }

      const history = createMockHistoryResponse(symbol, pointCount);
      if (!history) {
        return HttpResponse.json(createMockHistoryNotFound(symbol), { status: 404 });
      }

      return HttpResponse.json(history, { status: 200 });
    }),
  ];
}
