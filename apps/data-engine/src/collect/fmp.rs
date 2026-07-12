use anyhow::{Context, Result, bail};
use serde_json::Value;

use crate::domain::Dataset;

/// Minimal FMP client for the four watchlist datasets. Authenticates with the
/// `apikey` header so the key never appears in URLs or logs.
#[derive(Clone)]
pub struct Client {
    base_url: String,
    api_key: String,
    http: reqwest::Client,
}

impl Client {
    pub fn new(base_url: String, api_key: String) -> Result<Self> {
        let http = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(30))
            .build()
            .context("build HTTP client")?;
        Ok(Self {
            base_url,
            api_key,
            http,
        })
    }

    /// Fetch one dataset for one symbol and return the raw JSON payload.
    pub async fn fetch(&self, dataset: Dataset, symbol: &str) -> Result<Value> {
        let (path, extra): (&str, &[(&str, &str)]) = match dataset {
            Dataset::Quote => ("quote", &[]),
            Dataset::Profile => ("profile", &[]),
            Dataset::IncomeQuarterly => {
                ("income-statement", &[("period", "quarter"), ("limit", "4")])
            }
            Dataset::Dividends => ("dividends", &[]),
        };

        let response = self
            .http
            .get(format!("{}/{path}", self.base_url))
            .header("apikey", &self.api_key)
            .query(&[("symbol", symbol)])
            .query(extra)
            .send()
            .await
            .with_context(|| format!("execute FMP {dataset} request for {symbol}"))?;

        let status = response.status();
        let body = response
            .text()
            .await
            .with_context(|| format!("read FMP {dataset} response for {symbol}"))?;
        if !status.is_success() {
            // 402 marks endpoints outside the current subscription tier.
            bail!(
                "FMP {dataset} request for {symbol} failed with status {status}: {}",
                snippet(&body)
            );
        }

        let payload: Value = serde_json::from_str(&body)
            .with_context(|| format!("decode FMP {dataset} response for {symbol}"))?;
        let records = payload
            .as_array()
            .with_context(|| format!("FMP {dataset} response for {symbol} is not an array"))?;
        if records.is_empty() {
            bail!("FMP returned no {dataset} data for {symbol}");
        }
        Ok(payload)
    }
}

fn snippet(body: &str) -> String {
    body.chars().take(160).collect()
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::extract::Query;
    use axum::http::HeaderMap;
    use axum::routing::get;
    use axum::{Json, Router};
    use std::collections::HashMap;

    async fn serve(router: Router) -> String {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let addr = listener.local_addr().unwrap();
        tokio::spawn(async move { axum::serve(listener, router).await.unwrap() });
        format!("http://{addr}")
    }

    #[tokio::test]
    async fn sends_key_header_and_dataset_query() {
        let router = Router::new().route(
            "/income-statement",
            get(
                |headers: HeaderMap, Query(query): Query<HashMap<String, String>>| async move {
                    assert_eq!(headers.get("apikey").unwrap(), "test-key");
                    assert_eq!(query.get("symbol").unwrap(), "AAPL");
                    assert_eq!(query.get("period").unwrap(), "quarter");
                    assert_eq!(query.get("limit").unwrap(), "4");
                    Json(serde_json::json!([{"epsDiluted": 1.0}]))
                },
            ),
        );
        let base = serve(router).await;
        let client = Client::new(base, "test-key".into()).unwrap();
        let payload = client
            .fetch(Dataset::IncomeQuarterly, "AAPL")
            .await
            .unwrap();
        assert_eq!(payload[0]["epsDiluted"], 1.0);
    }

    #[tokio::test]
    async fn surfaces_http_status_errors() {
        let router = Router::new().route(
            "/profile",
            get(|| async {
                (
                    axum::http::StatusCode::PAYMENT_REQUIRED,
                    "Restricted Endpoint",
                )
            }),
        );
        let base = serve(router).await;
        let client = Client::new(base, "k".into()).unwrap();
        let error = client.fetch(Dataset::Profile, "AAPL").await.unwrap_err();
        let message = format!("{error:#}");
        assert!(message.contains("402"), "message: {message}");
        assert!(
            message.contains("Restricted Endpoint"),
            "message: {message}"
        );
    }

    #[tokio::test]
    async fn rejects_empty_payloads() {
        let router = Router::new().route("/quote", get(|| async { Json(serde_json::json!([])) }));
        let base = serve(router).await;
        let client = Client::new(base, "k".into()).unwrap();
        let error = client.fetch(Dataset::Quote, "ZZZZ").await.unwrap_err();
        assert!(format!("{error:#}").contains("no quote data"));
    }
}
