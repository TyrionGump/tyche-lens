# tyche-api

General backend for Tyche Lens. Serves mock market data today; the
contract-first shape is the part meant to last.

## Contract-first workflow

`api/openapi.yaml` is the single source of truth for the HTTP surface.
Both sides generate from it, so neither can drift from the contract
without a compile error:

```
api/openapi.yaml
  ├─ internal/httpapi/gen.go      oapi-codegen: types + strict gin server
  └─ ../web/src/domain/market/api/generated/openapi.ts
                                  openapi-typescript (run from apps/web)
```

To change the API:

1. Edit `api/openapi.yaml`.
2. `go generate ./...` — regenerates `internal/httpapi/gen.go`.
3. Implement the new strict methods (the build fails until you do).
4. In `apps/web`: `pnpm generate:api`.

## Run

```
go run ./cmd/tyche-api    # listens on LISTEN_ADDR, default 127.0.0.1:8081
go test ./...
```

`GET /healthz` is a public probe outside the contract. Everything else
lives under `/v1` and is described by the spec.

## Local database

Postgres for local development. Nothing in the API reads it yet — it
exists so persistent features have somewhere to land.

```
docker compose up -d     # postgres:18 on localhost:5432; auto-starts with Docker
docker compose down -v   # stop and erase all data
```

DSN: `postgres://tyche:tyche@localhost:5432/tyche_api` (local-only
credentials). Data lives in a named volume, so plain `down`/`up` keeps
it; only `-v` resets.

## Layout

```
api/openapi.yaml     the contract
cmd/tyche-api        entrypoint: config, slog, graceful shutdown
internal/httpapi     transport — generated gen.go + one file per resource
  server.go            Server, Market interface, NewServer, NewHandler
  quotes.go            GetQuotes, GetQuoteHistory
  symbols.go           GetSymbols
internal/market      domain: mock catalog, quotes, deterministic series
internal/config      env config (LISTEN_ADDR)
```

## Growing the API

Deliberately deferred, each with its trigger:

- **Runtime request validation** — re-enable `embedded-spec` in
  `internal/httpapi/oapi-codegen.yaml` and mount gin-middleware's
  `OapiRequestValidator`, plus a `RequestErrorHandlerFunc` in the strict
  options: do this when the first endpoint takes a request body, or the
  first consumer besides `apps/web` appears. Scope the validator via
  `GinServerOptions.Middlewares`, never `engine.Use` — global scope
  rejects `/healthz`.
- **Access logging, CORS, rate limiting, auth** — at real deployment.
  CORS is unnecessary while `apps/web` reaches the API through its Vite
  dev proxy.
- **Spec splitting** — when `openapi.yaml` gets unwieldy, split per
  resource joined by `$ref` and bundle before codegen; generated output
  and layout stay the same.
