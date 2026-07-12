# Tyche Lens — Reference Docs

Reference documentation for Tyche Lens. The project intro — what it is, current state, non-goals, principles — lives in the [repo-root README](../README.md).

| Doc | Contents |
|---|---|
| [Architecture](architecture.md) | What exists today; compute-on-request model, layering, provider-adapter design |
| [Finance notes](finance-notes.md) | Glossary and valuation formulas — the finance-learning content |
| [Market-data providers](market-data-providers.md) | Data-source research: free tiers, trade-offs, recommended set |
| [Decisions (ADRs)](decisions/README.md) | Significant choices and their rationale |

Per-app docs: [`apps/api/README.md`](../apps/api/README.md) · [`apps/web/README.md`](../apps/web/README.md) · [`apps/web/docs/ARCHITECTURE.md`](../apps/web/docs/ARCHITECTURE.md)

## Conventions

- Plain GitHub-flavored Markdown with **relative links** — renders on GitHub and in Obsidian (the `.obsidian/` vault config stays untracked).
- Volatile, provider-specific facts stay in [market-data-providers.md](market-data-providers.md), marked as subject to change.
- Significant or hard-to-reverse choices get an ADR: copy [`decisions/_template.md`](decisions/_template.md), increment the number, add a row to the [index](decisions/README.md).

## Ideas

A parking lot, not a plan — things that might happen, in no particular order, with no dates attached.

- Wire the first real provider (FMP) behind an adapter; compute PE from real data.
- Watchlist with multi-select compare and user-pickable stat columns.
- Historical price charts; PS and P/FCF alongside PE.
- Fundamentals: financial-statement tables across periods, small metric charts.
- Finnhub as quote / profile / news fallback.
- SEC EDGAR as the official fundamentals source (later); FRED macro data (maybe).
- UI visual direction still open — terminal-dense vs fintech-light vs editorial-calm.
- Decide the production data-engine shape — where the shared store lives and who serves it — informed by the Rust demo in [`apps/data-engine`](../apps/data-engine/README.md).
