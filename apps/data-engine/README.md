# tyche-data-engine-rust

**Temporary demo app.** A minimal Rust proof of the watchlist data flow:

> scheduled FMP collection → local file store → consumers query the store,
> never FMP.

It exists to inform the real architecture decision (where the shared store
lives and who serves it). It is not the production engine.

## What it does

- Collects four FMP `/stable` datasets per configured symbol — `quote`,
  `profile`, `income-statement?period=quarter&limit=4`, `dividends` — the
  inputs for one complete `apps/web` watchlist row.
- Stores each response unmodified under `data/<SYMBOL>/<dataset>.json` in an
  envelope with `fetched_at` (same-directory temp file + atomic rename;
  failures keep the last good file).
- Refreshes quotes every `QUOTE_REFRESH_MINUTES` while running; the slow
  datasets only when older than `SLOW_REFRESH_HOURS`. Missing files are
  backfilled at startup.
- Serves the store over HTTP; derived metrics are computed at serve time so
  stored data stays raw and the math stays transparent:
  - `eps_ttm` — sum of diluted EPS over the latest four quarters
  - `pe` — price / TTM EPS, `null` unless both are positive
  - `dividend_yield_pct` — trailing-365-day dividends ÷ price × 100

## Deliberate non-goals

Per-user subscriptions, market-hours calendar, retry ladder, request
batching, auth on the read API (loopback bind only), and non-US symbols
(FMP's free tier rejects them). The Go engine (`tyche-data-engine`) owns the
production-shaped versions of those ideas.

## Code layout & conventions

Standard Rust service layout — `src/lib.rs` owns the modules, `src/main.rs`
is a thin binary wrapper — with the module tree mirroring the data flow:

```text
src/
  domain/      shared vocabulary: Dataset enum, symbol validity rules
  collect.rs   WRITE path: scheduler/orchestration (FMP → store)
  collect/fmp.rs   the FMP HTTP client
  store.rs     the seam both paths meet at: file store + Envelope
  serve.rs     READ path: HTTP routes (store → consumers)
  serve/snapshot.rs   watchlist-row assembly, private to `serve`
  config.rs    env → Config (Debug impl redacts the API key)
```

Unit tests live inline per module in `#[cfg(test)] mod tests` blocks (the
Rust convention — they exercise private items and are compiled out of
release builds); black-box tests of the HTTP surface live in `tests/` as
integration tests. Provider responses are deserialized into typed structs
at read time.

Deferred until there is a trigger: typed error enums (`thiserror`) if this
crate is ever consumed as a library (`anyhow` is the norm for application
code); cooperative shutdown for the collector task once writes are more
than one atomic rename; CI once the repo stops being temporary.

## Run

```powershell
$env:FMP_API_KEY = '<key>'          # required; never committed
$env:SYMBOLS = 'AAPL,MSFT'          # optional, default AAPL,NVDA,TSLA,MSFT,AMZN
cargo run
```

The service reads the process environment directly and does not load `.env`.
See `.env.example` for all variables.

## Read API

```text
GET /healthz                        → "ok"
GET /v1/symbols                     → {"symbols": ["AAPL", ...]}
GET /v1/symbols/{symbol}/snapshot   → one watchlist row, e.g.:
```

```json
{
  "symbol": "AAPL",
  "company_name": "Apple Inc.",
  "exchange": "NASDAQ",
  "sector": "Technology",
  "price": 315.32,
  "change_percent": -0.28,
  "market_cap": 4631217093920.0,
  "year_high": 317.4,
  "year_low": 201.5,
  "beta": 1.097,
  "eps_ttm": 8.29,
  "pe": 38.0,
  "dividend_yield_pct": 1.31,
  "sources": { "quote": "2026-07-11T05:00:00Z", "profile": "..." }
}
```

Values above are illustrative. Missing datasets serve as `null` fields, with
per-dataset `fetched_at` stamps under `sources` for staleness labeling.

## FMP quota

Free tier: 250 requests/day. Cold start costs 4 requests per symbol; each
refresh tick costs 1 per symbol (quotes only). Five symbols refreshed every
15 minutes for a 3-hour demo session ≈ 80 requests.

## Validation

```powershell
cargo test
cargo clippy
```

Tests use fixtures captured from real FMP responses (`tests/fixtures/`) and
local mock HTTP servers; no API key required.
