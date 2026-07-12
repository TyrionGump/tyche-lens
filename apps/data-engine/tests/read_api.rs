//! Integration tests: the read API exercised over HTTP through the crate's
//! public surface, with a store seeded from real captured FMP fixtures.

use std::sync::Arc;

use serde_json::{Value, json};
use tyche_data_engine_rust::domain::Dataset;
use tyche_data_engine_rust::serve::router;
use tyche_data_engine_rust::store::{Envelope, Store};

const QUOTE_FIXTURE: &str = include_str!("fixtures/quote.json");
const PROFILE_FIXTURE: &str = include_str!("fixtures/profile.json");
const INCOME_FIXTURE: &str = include_str!("fixtures/income-quarterly.json");
const DIVIDENDS_FIXTURE: &str = include_str!("fixtures/dividends.json");

async fn serve(store: Arc<Store>) -> String {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let addr = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, router(store)).await.unwrap() });
    format!("http://{addr}")
}

fn fixture_envelope(raw: &str) -> Envelope {
    Envelope::from_fmp(serde_json::from_str(raw).unwrap())
}

#[tokio::test]
async fn serves_a_complete_watchlist_row_from_stored_fixtures() {
    let dir = tempfile::tempdir().unwrap();
    let store = Arc::new(Store::new(dir.path()));
    store
        .write("AAPL", Dataset::Quote, &fixture_envelope(QUOTE_FIXTURE))
        .unwrap();
    store
        .write("AAPL", Dataset::Profile, &fixture_envelope(PROFILE_FIXTURE))
        .unwrap();
    store
        .write(
            "AAPL",
            Dataset::IncomeQuarterly,
            &fixture_envelope(INCOME_FIXTURE),
        )
        .unwrap();
    store
        .write(
            "AAPL",
            Dataset::Dividends,
            &fixture_envelope(DIVIDENDS_FIXTURE),
        )
        .unwrap();
    let base = serve(store).await;

    let health = reqwest::get(format!("{base}/healthz")).await.unwrap();
    assert_eq!(health.status(), 200);

    let symbols: Value = reqwest::get(format!("{base}/v1/symbols"))
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    assert_eq!(symbols["symbols"], json!(["AAPL"]));

    let response = reqwest::get(format!("{base}/v1/symbols/aapl/snapshot"))
        .await
        .unwrap();
    assert_eq!(response.status(), 200, "lowercase symbol is normalized");
    let snapshot: Value = response.json().await.unwrap();

    // PE must equal price / sum of the four fixture quarters' diluted EPS.
    let quote: Value = serde_json::from_str(QUOTE_FIXTURE).unwrap();
    let income: Value = serde_json::from_str(INCOME_FIXTURE).unwrap();
    let price = quote[0]["price"].as_f64().unwrap();
    let eps_sum: f64 = income
        .as_array()
        .unwrap()
        .iter()
        .take(4)
        .map(|record| record["epsDiluted"].as_f64().unwrap())
        .sum();
    assert_eq!(snapshot["price"].as_f64().unwrap(), price);
    assert!((snapshot["pe"].as_f64().unwrap() - price / eps_sum).abs() < 1e-9);
    assert_eq!(snapshot["sector"], quote_profile_sector());
    assert!(snapshot["dividend_yield_pct"].is_number());
    assert!(snapshot["sources"]["quote"].is_string());
}

fn quote_profile_sector() -> Value {
    let profile: Value = serde_json::from_str(PROFILE_FIXTURE).unwrap();
    profile[0]["sector"].clone()
}

#[tokio::test]
async fn serves_partial_snapshot_when_only_the_quote_exists() {
    let dir = tempfile::tempdir().unwrap();
    let store = Arc::new(Store::new(dir.path()));
    store
        .write(
            "BARE",
            Dataset::Quote,
            &Envelope::from_fmp(json!([{"price": 100.0, "name": "Bare Co"}])),
        )
        .unwrap();
    let base = serve(store).await;

    let snapshot: Value = reqwest::get(format!("{base}/v1/symbols/BARE/snapshot"))
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    assert_eq!(snapshot["price"].as_f64().unwrap(), 100.0);
    assert!(snapshot["pe"].is_null(), "no income data stored");
    assert!(snapshot["sources"]["profile"].is_null());
}

#[tokio::test]
async fn rejects_unknown_and_invalid_symbols() {
    let dir = tempfile::tempdir().unwrap();
    let base = serve(Arc::new(Store::new(dir.path()))).await;

    let missing = reqwest::get(format!("{base}/v1/symbols/MSFT/snapshot"))
        .await
        .unwrap();
    assert_eq!(missing.status(), 404);
    let body: Value = missing.json().await.unwrap();
    assert_eq!(body["code"], "unknown_symbol");

    // ".." would otherwise escape the store root as a path segment. Clients
    // normalize literal dot segments away, so the validator's rejection of
    // dot-only symbols is unit-tested in `symbol`; here we prove the raw
    // route never answers 200 for either spelling.
    let invalid = reqwest::get(format!("{base}/v1/symbols/../snapshot"))
        .await
        .unwrap();
    assert_ne!(invalid.status(), 200);
    let invalid_chars = reqwest::get(format!("{base}/v1/symbols/AA%20PL/snapshot"))
        .await
        .unwrap();
    assert_eq!(invalid_chars.status(), 400);
}
