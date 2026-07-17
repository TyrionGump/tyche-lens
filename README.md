# Tyche Lens

Personal investment-information and US-equity market-data dashboard, built as a **learning project**: a way to practice professional software development across different languages and stacks (Go, TypeScript, and Rust so far) while learning finance and market-data concepts along the way. It is not a trading system and gives no buy/sell/hold advice.

> **Status:** early and growing gradually. Features are added as learning opportunities arise — there is no fixed roadmap, and everything is provisional.

## What it does today

Contract-first mock data, end to end:

- **[`apps/api`](apps/api/README.md)** — Go backend (gin). Serves mock quotes, symbols, and price history. The OpenAPI contract (`apps/api/api/openapi.yaml`) is the single source of truth; the server interface is generated from it.
- **[`apps/web`](apps/web/README.md)** — React 19 + TypeScript dashboard (Vite, Tailwind, TanStack Query). Generates its client, request/response validators, and Faker response factories from the same contract; handwritten MSW handlers provide the default backend-free workflow.

Plus a standalone experiment:

- **[`apps/data-engine`](apps/data-engine/README.md)** — temporary Rust demo of a collect-and-store data flow: scheduled FMP collection into a local file store, served over a small read API with metrics (TTM EPS, PE, dividend yield) derived at serve time. Not wired to the web app; it exists to inform where a shared data store should live.

## Where it's headed (loosely)

Real market-data providers (FMP, Finnhub, SEC EDGAR) behind replaceable adapters; company fundamentals; valuation metrics (PE, PS, P/FCF) computed transparently from latest price and TTM fundamentals; a watchlist with compare. See the [ideas list](docs/README.md#ideas) — things that might happen, in no particular order, with no dates attached.

## Repository layout

| Path | What |
|---|---|
| [`apps/api`](apps/api/README.md) | Go backend — contract-first REST API |
| [`apps/web`](apps/web/README.md) | React + TypeScript web dashboard |
| [`apps/data-engine`](apps/data-engine/README.md) | Rust demo — scheduled market-data collection → file store → read API |
| [`docs/`](docs/README.md) | Reference docs — architecture, finance notes, provider research, decisions |

## Non-goals

- ❌ Not a trading or order-execution system.
- ❌ Not a real-time tick system — delayed and end-of-day data are fine.
- ❌ Not a financial-advisory product — **no buy/sell/hold recommendations**.
- ❌ Not a data warehouse — compute on request instead of storing bulk history.

## Principles

- Prefer simple, boring, maintainable solutions over premature optimization.
- Be explicit about data provenance, staleness, and provider limitations.
- Keep provider-specific code at the edges; the core uses internal domain models.
- Prefer free / low-cost data tiers; treat rate limits as first-class constraints.
- Keep valuation math transparent and reproducible; never commit secrets.

## About the name

**Tyche** — the Greek goddess of fortune and chance — reflects the role of uncertainty in investing. **Lens** reflects the goal of *observing and understanding* the market rather than pretending to predict it.

## License

[MIT](LICENSE) © 2026 Andrew Sun.
