# Architecture

> **Status:** living document — what exists today, plus standing principles. Per-app detail lives in the app READMEs.

## Shape today

One repository, three apps; `api` and `web` share one contract:

```
apps/api          Go (gin) — REST API; api/openapi.yaml is the source of truth
apps/web          React 19 + TypeScript — client generated from the same contract
apps/data-engine  Rust — temporary demo: scheduled FMP collection → file store → read API
```

- **Contract-first.** `apps/api/api/openapi.yaml` describes the HTTP surface. The Go server interface (oapi-codegen, strict) and the web contract artifacts (Orval-generated Fetch client, DTOs, Zod request/response validators, and Faker response factories) are generated from it. Handwritten MSW handlers remain the single mock-behavior authority. CI regenerates and byte-compares both committed outputs, then tests the API and web app. See [ADR 0002](decisions/0002-api-contract-management.md) — written before the monorepo; it carries a note on what that changed.
- **Mock market.** The API currently serves a deterministic mock catalog (symbols, quotes, price history); the contract-first shape is the part meant to last. Postgres is provisioned via docker-compose but nothing reads it yet.
- **Web app.** Feature-first boundaries and TanStack Query for server state. Local development uses contract-driven MSW responses by default; `pnpm dev:api` opts into the Vite `/v1` proxy for the Go service. See [`apps/web/docs/ARCHITECTURE.md`](../apps/web/docs/ARCHITECTURE.md).
- **Data-engine demo.** A temporary, standalone Rust proof of a collect-and-store flow: scheduled FMP collection within free-tier quota, raw responses stored as JSON envelopes on disk, derived metrics (TTM EPS, PE, dividend yield) computed at serve time. Not wired to `api`/`web`; it explores a scheduled-collection alternative to pure compute-on-request and informs where a shared data store should live. See [`apps/data-engine/README.md`](../apps/data-engine/README.md).

## Core principle: compute-on-request

Avoid storing large historical datasets. Fetch what a view needs when it opens, normalize into internal models, compute metrics on the fly, and cache briefly. See [ADR 0001](decisions/0001-compute-on-request-and-short-cache.md).

1. User opens a symbol (or watchlist).
2. A service requests data from the relevant provider adapter (price / fundamentals / filings).
3. The response is normalized into internal domain models.
4. Valuation metrics are computed on request.
5. The result is returned to the UI and cached for a short, data-appropriate period.

### Caching guideline

| Data | Suggested cache |
|---|---|
| Latest quote | 5–30 seconds |
| Daily price data | 6–24 hours |
| Financial statements | 1–7 days |
| Company profile | 7–30 days |
| Computed valuation | ~1 day |

**Worth persisting:** watchlist symbols, symbol → CIK mapping, provider raw-response cache, latest-price rolling cache, recently computed valuations.

**Not worth persisting (initially):** bulk historical OHLCV, all SEC company facts, every valuation snapshot.

## Layering

- **Provider adapters** — one interface per role, many implementations; adapters map provider JSON into domain models.
- **Domain models** — internal, provider-independent types.
- **Services** — orchestration and computation (price, fundamentals, valuation).
- **UI** — depends only on domain models / service results.

> **Design rule:** the UI never depends on provider-specific fields. Conversion happens at the adapter boundary.

### Provider roles

| Role | Responsibility | Candidate providers |
|---|---|---|
| Latest price | Last / near-real-time quote | Alpaca, Finnhub |
| Daily / historical price | EOD bars | FMP, Stooq (CSV backup) |
| Intraday price (experimental) | 1m / 5m bars | Twelve Data, Alpha Vantage |
| Fundamentals | Statements, EPS, ratios | FMP, SEC EDGAR (official) |
| Filings | Official filings / XBRL facts | SEC EDGAR |
| Macro (optional) | CPI, GDP, rates | FRED |

Provider details, free-tier limits, and trade-offs: [market-data-providers.md](market-data-providers.md).

### Adapter rules

- Treat free tiers' rate limits and delays as first-class constraints, documented per provider.
- Name adapters for what they really are — Stooq offers downloadable CSV URLs, not a committed API, so `StooqCsvPriceProvider`, not `StooqApiClient`.

## Domain-model principles

- Provider-independent: no provider field names leak into internal types.
- Exact decimal types for monetary values — never binary floating point.
- Prefer **diluted** EPS; compute valuation on a **TTM** basis. See [finance-notes.md](finance-notes.md).

## Open questions

- Where the cache lives (in-memory vs a lightweight store; Postgres is available but unused).
- When real provider adapters replace the mock market domain — and whether the data-engine's collect-and-store flow becomes part of that path.
