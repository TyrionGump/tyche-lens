# Finance Notes

> **Status:** learning notes by an investing beginner — plain-language definitions and formulas, with caveats flagged. **Not investment advice.**

## Glossary

### Market data

| Term                      | Meaning                                                     |
| ------------------------- | ----------------------------------------------------------- |
| Ticker / Symbol           | Stock code, e.g. `AAPL`, `MSFT`, `NVDA`                     |
| Price                     | Current or latest traded price                              |
| Real-time                 | Live market data (often requires a paid data license)       |
| Delayed                   | Data delayed by some interval, commonly 15 minutes          |
| Historical price          | Past price data                                             |
| Open / High / Low / Close | Prices marking a period                                     |
| Volume                    | Quantity traded in a period                                 |
| OHLCV                     | Open, High, Low, Close, Volume                              |
| Bar / Candle              | Aggregated price data for a time window (e.g. 1 min, 1 day) |
| Quote                     | Bid / ask information                                       |
| Trade                     | An actual executed transaction                              |
| EOD                       | End-of-day (daily close) data                               |

### Company financials

| Term | Meaning |
|---|---|
| Revenue | Sales / income from operations |
| Gross profit | Revenue minus direct cost of goods/services |
| Operating income | Profit after operating expenses |
| Net income | Final profit after all expenses and taxes |
| EPS | Earnings per share |
| Diluted EPS | EPS assuming all convertible securities are exercised (more conservative) |
| Balance sheet | What the company owns and owes |
| Income statement | What the company earned and spent |
| Cash flow statement | Actual cash inflows and outflows |
| Free cash flow (FCF) | Cash left after maintaining/expanding operations |
| Fundamentals | Company financial and business data |
| TTM | Trailing Twelve Months — the most recent 12 months of results |

### Filings & valuation

| Term | Meaning |
|---|---|
| 10-K | US annual report filing |
| 10-Q | US quarterly report filing |
| SEC filing | Official document filed with the U.S. SEC |
| CIK | SEC Central Index Key — a company's filing identifier |
| XBRL | Structured data format for financial facts in SEC filings |
| PE | Price-to-Earnings ratio (price ÷ EPS) |
| PS | Price-to-Sales ratio |
| P/FCF | Price-to-Free-Cash-Flow ratio |
| Look-ahead bias | Using information that was not actually available at the historical point in time |

## Valuation metrics

Tyche Lens computes valuation metrics locally from latest price and TTM fundamentals, so the inputs and assumptions stay transparent.

### PE (Price-to-Earnings)

```text
PE = Price / EPS
```

Example: price `200`, TTM diluted EPS `6.5` → `PE = 200 / 6.5 ≈ 30.77`.

Because price moves continuously but EPS updates only on quarterly / annual results, the practical "current" PE is:

```text
Current PE = Latest Price / TTM Diluted EPS
```

So: price updates frequently, EPS updates quarterly, and PE changes whenever price changes.

### Other ratios

- **PS** = Price / Sales per share, or Market Cap / Revenue.
- **P/FCF** = Price / Free Cash Flow per share, or Market Cap / FCF.

### Caveats

- Prefer **TTM PE** over **forward PE** — forward PE relies on analyst estimates, not official filings.
- Prefer **diluted EPS** over basic EPS (more conservative).
- If EPS is negative, PE is usually not meaningful — show `N/A`.
- Avoid **look-ahead bias** in historical metrics: never use EPS that had not yet been reported at the historical date.
- Be explicit about data provenance: official filing vs provider-cleaned vs analyst estimate.

_Data sources and their limits: see [market-data-providers.md](market-data-providers.md). How metrics fit the system: see [architecture.md](architecture.md)._
