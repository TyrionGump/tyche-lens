//! Assembles the watchlist-row snapshot served by the read API.
//!
//! Derived metrics are computed here, at serve time, so the store keeps only
//! raw provider data and the math stays transparent.

use chrono::{DateTime, Days, NaiveDate, Utc};
use serde::de::DeserializeOwned;
use serde::{Deserialize, Serialize};

use crate::store::Envelope;

/// One watchlist row. Fields the store cannot answer are `None` and
/// serialize as `null`.
#[derive(Debug, Clone, Serialize)]
pub struct Snapshot {
    pub symbol: String,
    pub company_name: Option<String>,
    pub exchange: Option<String>,
    pub sector: Option<String>,
    pub price: Option<f64>,
    pub change: Option<f64>,
    pub change_percent: Option<f64>,
    pub open: Option<f64>,
    pub day_high: Option<f64>,
    pub day_low: Option<f64>,
    pub previous_close: Option<f64>,
    pub market_cap: Option<f64>,
    pub volume: Option<f64>,
    pub year_high: Option<f64>,
    pub year_low: Option<f64>,
    pub beta: Option<f64>,
    /// Sum of diluted EPS over the latest four quarters; `None` without four
    /// full quarters rather than a misleading partial sum.
    pub eps_ttm: Option<f64>,
    /// `price / eps_ttm`, `None` unless both are positive.
    pub pe: Option<f64>,
    /// Dividends with an ex-date in the trailing 365 days ÷ price × 100.
    pub dividend_yield_pct: Option<f64>,
    pub sources: Sources,
}

/// Per-dataset collection timestamps for staleness labeling.
#[derive(Debug, Clone, Serialize)]
pub struct Sources {
    pub quote: DateTime<Utc>,
    pub profile: Option<DateTime<Utc>>,
    pub income_quarterly: Option<DateTime<Utc>>,
    pub dividends: Option<DateTime<Utc>>,
}

/// FMP record shapes, limited to the fields the snapshot consumes. Unknown
/// fields are ignored; absent fields deserialize to `None` instead of failing.
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct QuoteRecord {
    name: Option<String>,
    exchange: Option<String>,
    price: Option<f64>,
    change: Option<f64>,
    change_percentage: Option<f64>,
    open: Option<f64>,
    day_high: Option<f64>,
    day_low: Option<f64>,
    previous_close: Option<f64>,
    market_cap: Option<f64>,
    volume: Option<f64>,
    year_high: Option<f64>,
    year_low: Option<f64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ProfileRecord {
    company_name: Option<String>,
    sector: Option<String>,
    beta: Option<f64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct IncomeRecord {
    eps_diluted: Option<f64>,
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct DividendRecord {
    date: Option<String>,
    adj_dividend: Option<f64>,
    dividend: Option<f64>,
}

pub fn build_snapshot(
    symbol: &str,
    quote: &Envelope,
    profile: Option<&Envelope>,
    income: Option<&Envelope>,
    dividends: Option<&Envelope>,
    now: DateTime<Utc>,
) -> Snapshot {
    let quote_record = first_record::<QuoteRecord>(Some(quote));
    let profile_record = first_record::<ProfileRecord>(profile);
    let income_records = records::<IncomeRecord>(income);
    let dividend_records = records::<DividendRecord>(dividends);

    let price = quote_record.as_ref().and_then(|record| record.price);
    let eps_ttm = eps_ttm(income_records.as_deref());
    let pe = match (price, eps_ttm) {
        (Some(price), Some(eps)) if price > 0.0 && eps > 0.0 => Some(price / eps),
        _ => None,
    };
    let dividend_yield_pct = dividend_yield_pct(dividend_records.as_deref(), price, now);

    Snapshot {
        symbol: symbol.to_string(),
        company_name: quote_record
            .as_ref()
            .and_then(|record| record.name.clone())
            .or_else(|| {
                profile_record
                    .as_ref()
                    .and_then(|record| record.company_name.clone())
            }),
        exchange: quote_record
            .as_ref()
            .and_then(|record| record.exchange.clone()),
        sector: profile_record
            .as_ref()
            .and_then(|record| record.sector.clone()),
        price,
        change: quote_record.as_ref().and_then(|record| record.change),
        change_percent: quote_record
            .as_ref()
            .and_then(|record| record.change_percentage),
        open: quote_record.as_ref().and_then(|record| record.open),
        day_high: quote_record.as_ref().and_then(|record| record.day_high),
        day_low: quote_record.as_ref().and_then(|record| record.day_low),
        previous_close: quote_record
            .as_ref()
            .and_then(|record| record.previous_close),
        market_cap: quote_record.as_ref().and_then(|record| record.market_cap),
        volume: quote_record.as_ref().and_then(|record| record.volume),
        year_high: quote_record.as_ref().and_then(|record| record.year_high),
        year_low: quote_record.as_ref().and_then(|record| record.year_low),
        beta: profile_record.as_ref().and_then(|record| record.beta),
        eps_ttm,
        pe,
        dividend_yield_pct,
        sources: Sources {
            quote: quote.fetched_at,
            profile: profile.map(|envelope| envelope.fetched_at),
            income_quarterly: income.map(|envelope| envelope.fetched_at),
            dividends: dividends.map(|envelope| envelope.fetched_at),
        },
    }
}

/// A payload that fails to deserialize behaves like a missing dataset: the
/// snapshot still serves, with `None` for the affected fields.
fn records<T: DeserializeOwned>(envelope: Option<&Envelope>) -> Option<Vec<T>> {
    serde_json::from_value(envelope?.payload.clone()).ok()
}

fn first_record<T: DeserializeOwned>(envelope: Option<&Envelope>) -> Option<T> {
    records::<T>(envelope)?.into_iter().next()
}

fn eps_ttm(records: Option<&[IncomeRecord]>) -> Option<f64> {
    let records = records?;
    if records.len() < 4 {
        return None;
    }
    let mut sum = 0.0;
    for record in &records[..4] {
        sum += record.eps_diluted?;
    }
    Some(sum)
}

fn dividend_yield_pct(
    records: Option<&[DividendRecord]>,
    price: Option<f64>,
    now: DateTime<Utc>,
) -> Option<f64> {
    let records = records?;
    let price = price.filter(|price| *price > 0.0)?;
    let cutoff = now.date_naive().checked_sub_days(Days::new(365))?;

    let mut total = 0.0;
    for record in records {
        let Some(date) = record
            .date
            .as_deref()
            .and_then(|raw| NaiveDate::parse_from_str(raw, "%Y-%m-%d").ok())
        else {
            continue;
        };
        if date < cutoff {
            continue;
        }
        total += record.adj_dividend.or(record.dividend).unwrap_or(0.0);
    }
    Some(total / price * 100.0)
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::Value;

    const QUOTE_FIXTURE: &str = include_str!("../../tests/fixtures/quote.json");
    const PROFILE_FIXTURE: &str = include_str!("../../tests/fixtures/profile.json");
    const INCOME_FIXTURE: &str = include_str!("../../tests/fixtures/income-quarterly.json");
    const DIVIDENDS_FIXTURE: &str = include_str!("../../tests/fixtures/dividends.json");

    fn fixed_now() -> DateTime<Utc> {
        "2026-07-11T12:00:00Z".parse().unwrap()
    }

    fn envelope(raw: &str) -> Envelope {
        Envelope {
            fetched_at: fixed_now(),
            source: "fmp".to_string(),
            payload: serde_json::from_str(raw).unwrap(),
        }
    }

    #[test]
    fn assembles_snapshot_from_real_fixtures() {
        let quote = envelope(QUOTE_FIXTURE);
        let profile = envelope(PROFILE_FIXTURE);
        let income = envelope(INCOME_FIXTURE);
        let dividends = envelope(DIVIDENDS_FIXTURE);

        let snapshot = build_snapshot(
            "AAPL",
            &quote,
            Some(&profile),
            Some(&income),
            Some(&dividends),
            fixed_now(),
        );

        // Expected values derived from the fixtures themselves.
        let price = quote.payload[0]["price"].as_f64().unwrap();
        let eps_sum: f64 = income.payload.as_array().unwrap()[..4]
            .iter()
            .map(|record| record["epsDiluted"].as_f64().unwrap())
            .sum();
        let expected_sector: Value = profile.payload[0]["sector"].clone();

        assert_eq!(snapshot.symbol, "AAPL");
        assert_eq!(snapshot.price, Some(price));
        assert_eq!(snapshot.sector.as_deref(), expected_sector.as_str());
        assert!(snapshot.company_name.unwrap().contains("Apple"));
        assert!((snapshot.eps_ttm.unwrap() - eps_sum).abs() < 1e-9);
        assert!((snapshot.pe.unwrap() - price / eps_sum).abs() < 1e-9);
        let yield_pct = snapshot.dividend_yield_pct.unwrap();
        assert!(yield_pct > 0.0 && yield_pct < 10.0, "yield: {yield_pct}");
        assert!(snapshot.sources.profile.is_some());
    }

    #[test]
    fn computes_exact_metrics_from_synthetic_data() {
        let quote = envelope(r#"[{"price": 100.0, "name": "Test Co", "exchange": "NASDAQ"}]"#);
        let income = envelope(
            r#"[{"epsDiluted": 1.25}, {"epsDiluted": 1.25}, {"epsDiluted": 1.25}, {"epsDiluted": 1.25}]"#,
        );
        let dividends = envelope(
            r#"[
                {"date": "2026-06-01", "adjDividend": 0.5},
                {"date": "2025-08-01", "dividend": 0.5},
                {"date": "2020-01-01", "adjDividend": 9.9}
            ]"#,
        );

        let snapshot = build_snapshot(
            "TEST",
            &quote,
            None,
            Some(&income),
            Some(&dividends),
            fixed_now(),
        );

        assert_eq!(snapshot.eps_ttm, Some(5.0));
        assert_eq!(snapshot.pe, Some(20.0));
        // Only the two dividends inside the trailing 365 days count.
        assert_eq!(snapshot.dividend_yield_pct, Some(1.0));
    }

    #[test]
    fn negative_ttm_eps_yields_null_pe() {
        let quote = envelope(r#"[{"price": 50.0}]"#);
        let income = envelope(
            r#"[{"epsDiluted": -2.0}, {"epsDiluted": -1.0}, {"epsDiluted": -1.0}, {"epsDiluted": -1.0}]"#,
        );
        let snapshot = build_snapshot("TEST", &quote, None, Some(&income), None, fixed_now());
        assert_eq!(snapshot.eps_ttm, Some(-5.0));
        assert!(snapshot.pe.is_none());
    }

    #[test]
    fn fewer_than_four_quarters_yields_null_eps() {
        let quote = envelope(r#"[{"price": 50.0}]"#);
        let income = envelope(r#"[{"epsDiluted": 1.0}, {"epsDiluted": 1.0}, {"epsDiluted": 1.0}]"#);
        let snapshot = build_snapshot("TEST", &quote, None, Some(&income), None, fixed_now());
        assert!(snapshot.eps_ttm.is_none());
        assert!(snapshot.pe.is_none());
    }

    #[test]
    fn missing_datasets_serve_nulls() {
        let quote = envelope(r#"[{"price": 10.0, "name": "Bare Co"}]"#);
        let snapshot = build_snapshot("BARE", &quote, None, None, None, fixed_now());
        assert!(snapshot.sector.is_none());
        assert!(snapshot.beta.is_none());
        assert!(snapshot.eps_ttm.is_none());
        assert!(snapshot.pe.is_none());
        assert!(snapshot.dividend_yield_pct.is_none());
        assert!(snapshot.sources.profile.is_none());
        assert_eq!(snapshot.price, Some(10.0));
    }

    #[test]
    fn malformed_payload_behaves_like_missing_dataset() {
        let quote = envelope(r#"[{"price": 10.0}]"#);
        let income = envelope(r#"{"not": "an array"}"#);
        let snapshot = build_snapshot("TEST", &quote, None, Some(&income), None, fixed_now());
        assert!(snapshot.eps_ttm.is_none());
        // The envelope still exists, so its timestamp is still reported.
        assert!(snapshot.sources.income_quarterly.is_some());
    }

    #[test]
    fn stale_dividends_produce_zero_yield() {
        let quote = envelope(r#"[{"price": 100.0}]"#);
        let dividends = envelope(r#"[{"date": "2024-01-01", "adjDividend": 1.0}]"#);
        let snapshot = build_snapshot("TEST", &quote, None, None, Some(&dividends), fixed_now());
        assert_eq!(snapshot.dividend_yield_pct, Some(0.0));
    }
}
