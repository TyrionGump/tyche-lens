# Market-Data Providers

> **Status:** research notes. ⚠️ Free tiers, pricing, and limits change frequently — verify against each provider's official docs before relying on anything here.

Tyche Lens prefers free / low-cost sources. Below are the candidates considered, their fit, and their limitations. How they slot into the system (adapter roles): see [architecture.md](architecture.md#provider-roles).

## Recommended starting set

For a first version:

- **FMP** — primary source for daily / EOD prices and fundamentals (statements, EPS, ratios).
- **Finnhub** — quotes, company profile, news, and fallback.
- **SEC EDGAR** — official filings / fundamentals as a source of truth (added as a second stage).
- **Stooq** — historical price **CSV** backup (not a formal API).
- **FRED** — optional macro data later.

> Realistic stance: do not treat free *real-time* quotes as a core capability. Fundamentals + delayed/EOD prices + historical prices are enough to support the learning goals.

## Provider notes

### FMP (Financial Modeling Prep)
- **Good for:** company profile, financial statements, key metrics, ratios, EPS, daily / EOD historical prices.
- **Limits:** free tier is not suited to 1m / 5m intraday.
- **Use:** main provider for fundamentals and daily history; compute valuation locally.

### Finnhub
- **Good for:** quotes, company profile, news, fallback.
- **Use:** complement to FMP for quote / profile / news.

### Alpaca
- **Good for:** latest price, WebSocket stream, watchlist UI, near-real-time updates.
- **Limits:** free equities data uses the IEX feed (not full consolidated market data); free historical data is restricted.
- **Use:** optional latest-price / UI stream; **not** the main historical source.

### SEC EDGAR
- **Good for:** official filings, official XBRL financial facts, long-term correctness / verification.
- **Limits:** raw and harder to process (CIK, US-GAAP tags, fiscal periods, units, amendments, TTM math).
- **Use:** add later as the official filing / validation source.

### Twelve Data
- **Good for:** free-tier 1m / 5m intraday experiments, small watchlists.
- **Limits:** limited free quota; not for large batch retrieval.
- **Use:** first choice when experimenting with free intraday data.

### Alpha Vantage
- **Good for:** intraday endpoint experiments (1 / 5 / 15 / 30 / 60 min), learning raw vs adjusted data.
- **Limits:** very limited free tier; not for frequent refresh or many symbols.
- **Use:** fallback / experiment only.

### Stooq
- **Not a formal API** — it offers downloadable CSV URLs for historical prices, e.g.
  `https://stooq.com/q/d/l/?s=aapl.us&i=d`
- **Use:** historical-price CSV **backup** only. Name the adapter `StooqCsvPriceProvider`, not `StooqApiClient`.

### FRED
- **Good for:** macro indicators (CPI, GDP, rates, unemployment).
- **Use:** optional later supplement.

## Considered but not core

| Source | Stance | Why |
|---|---|---|
| Polygon.io | Re-evaluate later | Free tier may have value; keep it simple for now |
| Databento | Future experiment | Professional / raw market data; too advanced for v1 |
| Yahoo Finance / yfinance | Experiment only | Unofficial; fine for research, not a stable dependency |
| IEX Cloud | Do not use | Service retired |

## Links

- SEC EDGAR data access — <https://www.sec.gov/search-filings/edgar-search-assistance/accessing-edgar-data>
- FMP pricing — <https://site.financialmodelingprep.com/pricing-plans>
- Finnhub pricing — <https://finnhub.io/pricing>
- Stooq historical data — <https://stooq.com/db/h/>
- FRED API docs — <https://fred.stlouisfed.org/docs/api/fred/>
- Polygon pricing — <https://polygon.io/pricing>
