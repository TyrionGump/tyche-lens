use std::time::Duration;

use anyhow::{Context, Result, bail};
use chrono::{DateTime, Utc};
use serde::Deserialize;

use super::quote::Quote;

pub(super) struct FmpClient {
    base_url: reqwest::Url,
    api_key: String,
    http: reqwest::Client,
}

impl FmpClient {
    pub(super) fn new(base_url: &str, api_key: &str) -> Result<Self> {
        let api_key = api_key.trim().to_owned();
        if api_key.is_empty() {
            bail!("FMP_API_KEY must not be empty");
        }

        let base_url = reqwest::Url::parse(&format!("{}/", base_url.trim().trim_end_matches('/')))
            .context("FMP_BASE_URL must be a valid URL")?;
        let http = reqwest::Client::builder()
            .timeout(Duration::from_secs(15))
            .build()
            .context("build FMP HTTP client")?;

        Ok(Self {
            base_url,
            api_key,
            http,
        })
    }

    pub(super) async fn fetch_quote(&self, symbol: &str) -> Result<Quote> {
        let quote_url = self.base_url.join("quote").context("build FMP quote URL")?;
        let response = self
            .http
            .get(quote_url)
            .query(&[("symbol", symbol)])
            .query(&[("apikey", self.api_key.as_str())])
            .send()
            .await
            .map_err(reqwest::Error::without_url)
            .with_context(|| format!("request FMP quote for {symbol}"))?;

        let status = response.status();
        let body = response
            .text()
            .await
            .map_err(reqwest::Error::without_url)
            .with_context(|| format!("read FMP quote response for {symbol}"))?;

        if !status.is_success() {
            bail!(
                "FMP quote request for {symbol} failed with status {status}: {}",
                response_snippet(&body, &self.api_key)
            );
        }

        decode_quote(&body, symbol, Utc::now())
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct FmpQuote {
    symbol: String,
    name: String,
    exchange: String,
    price: f64,
    change_percentage: f64,
}

fn decode_quote(body: &str, requested_symbol: &str, fetched_at: DateTime<Utc>) -> Result<Quote> {
    let records: Vec<FmpQuote> = serde_json::from_str(body)
        .with_context(|| format!("decode FMP quote response for {requested_symbol}"))?;
    let record = records
        .into_iter()
        .next()
        .with_context(|| format!("FMP returned no quote for {requested_symbol}"))?;

    if !record.symbol.eq_ignore_ascii_case(requested_symbol) {
        bail!(
            "FMP returned symbol {} when {} was requested",
            record.symbol,
            requested_symbol
        );
    }

    Ok(Quote::new(
        record.symbol.to_uppercase(),
        record.name,
        record.exchange,
        record.price,
        record.change_percentage,
        "fmp".to_owned(),
        fetched_at,
    ))
}

fn response_snippet(body: &str, api_key: &str) -> String {
    body.replace(api_key, "<redacted>")
        .chars()
        .take(160)
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    const QUOTE_FIXTURE: &str = include_str!("../../tests/fixtures/quote.json");

    #[test]
    fn maps_provider_json_to_the_internal_quote() {
        let fetched_at = "2026-07-18T03:00:00Z".parse().unwrap();

        let quote = decode_quote(QUOTE_FIXTURE, "AAPL", fetched_at).unwrap();

        assert_eq!(
            quote,
            Quote::new(
                "AAPL".to_owned(),
                "Apple Inc.".to_owned(),
                "NASDAQ".to_owned(),
                315.32,
                -0.28461,
                "fmp".to_owned(),
                fetched_at,
            )
        );
    }

    #[test]
    fn rejects_empty_and_mismatched_responses() {
        let fetched_at = Utc::now();

        assert!(decode_quote("[]", "AAPL", fetched_at).is_err());
        assert!(
            decode_quote(
                r#"[{"symbol":"MSFT","name":"Microsoft","exchange":"NASDAQ","price":1.0,"changePercentage":0.0}]"#,
                "AAPL",
                fetched_at,
            )
            .is_err()
        );
    }

    #[test]
    fn redacts_the_api_key_from_provider_errors() {
        let snippet = response_snippet("request rejected for secret-key", "secret-key");

        assert_eq!(snippet, "request rejected for <redacted>");
    }

    #[test]
    fn validates_client_configuration() {
        assert!(FmpClient::new("not a URL", "key").is_err());
        assert!(FmpClient::new("https://financialmodelingprep.com/stable", " ").is_err());
    }
}
