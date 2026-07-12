# 0001 — Compute-on-request with short-lived cache

> **Status:** Accepted · **Date:** 2026-06-14

## Context

Tyche Lens is a personal learning project that prefers free / low-cost data and explicitly does **not** want to maintain a large historical data store. Most views (a symbol page, a watchlist) need recent prices, fundamentals, and a few derived metrics — not a complete local copy of market history.

## Decision

Adopt a **compute-on-request** model with **short-lived caching**:

- Fetch data from provider adapters when a view is opened.
- Normalize into [domain models](../architecture.md#domain-model-principles) and compute metrics on the fly.
- Cache results briefly, tuned per data type (seconds for quotes, hours for daily prices, days for statements).
- Persist only small, high-value items (watchlist, symbol → CIK map, rolling latest-price cache, recent valuations).

## Consequences

- ➕ Minimal storage and operational complexity; cheap to run.
- ➕ Always reflects reasonably fresh data without a sync pipeline.
- ➖ Repeated or expensive computations may re-run after cache expiry.
- ➖ Bounded by provider rate limits and availability — adapters must handle these gracefully.
- Revisit if/when historical-analysis needs make persistence clearly worthwhile.

_See [Architecture](../architecture.md) for the caching table and request flow._
