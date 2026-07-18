# data-engine

A small Rust prototype of one market-data flow:

```text
FMP quote API -> scheduled collector -> local JSON snapshot -> read-only HTTP API
```

The prototype answers one architectural question: can data be collected on a
schedule and served from a local store without API readers calling the provider?
It is intentionally not a complete market-data engine.

## Scope

The service:

- collects current quotes for a small configured symbol list;
- maps FMP responses into a provider-independent `Quote` type;
- stores the latest quotes in one local JSON file;
- keeps the last good quote when a later provider request fails;
- serves the stored snapshot through `GET /v1/quotes`; and
- exposes `GET /healthz` for a basic liveness check.

Profiles, financial statements, dividends, valuation calculations, market
calendars, authentication, retries, and database storage are deliberately
deferred. Each would add concepts without helping prove the core flow.

`price` is an `f64` only because this prototype transports and displays it; it
does not perform financial arithmetic. Introduce a decimal money type before
adding calculations.

## Code layout

```text
src/
  main.rs                   executable crate root and logging setup
  app.rs                    startup, dependency wiring, and shutdown
  app/config.rs             environment configuration
  app/http_api.rs           read-only HTTP routes
  market_data.rs            quote pipeline and read-only facade
  market_data/collector.rs  scheduled refresh workflow
  market_data/fmp.rs        provider adapter and response mapping
  market_data/quote.rs      provider-independent data model
  market_data/store.rs      JSON snapshot persistence
```

The package contains one binary crate. Its two top-level modules remain private:
`app` owns configuration and HTTP concerns, while `market_data` offers `app` a
quote pipeline and a read-only reader. The collector, provider adapter, model
construction, and persistence modules are nested privately inside
`market_data`, so the HTTP layer cannot reach into storage or provider details.
There are no traits or extra abstraction layers yet because the prototype has
only one provider and one store implementation.

## Run

```sh
export FMP_API_KEY="<key>"
cargo run
```

Optional configuration:

| Variable | Default |
| --- | --- |
| `SYMBOLS` | `AAPL,MSFT` |
| `LISTEN_ADDR` | `127.0.0.1:8090` |
| `DATA_FILE` | `./data/quotes.json` |
| `QUOTE_REFRESH_MINUTES` | `15` |
| `FMP_BASE_URL` | `https://financialmodelingprep.com/stable` |

The service reads the process environment directly; it does not load
`.env.example`.

## API

`GET /v1/quotes` returns the stored snapshot:

```json
{
  "quotes": [
    {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "exchange": "NASDAQ",
      "price": 315.32,
      "change_percent": -0.28461,
      "source": "fmp",
      "fetched_at": "2026-07-18T03:00:00Z"
    }
  ]
}
```

On a cold start the response can briefly be empty while the first collection is
running. Existing stored quotes are available immediately after a restart.

## Validate

```sh
cargo fmt --check
cargo test
cargo clippy --all-targets --all-features -- -D warnings
```

Tests use a captured FMP quote fixture and temporary files. They do not require
an API key or open network ports.
