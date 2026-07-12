//! The write path: fetch the configured symbols' datasets from FMP on a
//! schedule and persist them to the store. Failures never remove the last
//! good file; the next tick is the retry.

pub mod fmp;

use std::sync::Arc;
use std::time::Duration;

use chrono::{DateTime, Utc};
use tracing::{info, warn};

use crate::domain::Dataset;
use crate::store::{Envelope, Store};

/// Datasets refreshed on the slow cadence; the quote refreshes every tick.
const SLOW_DATASETS: [Dataset; 3] = [
    Dataset::Profile,
    Dataset::IncomeQuarterly,
    Dataset::Dividends,
];

pub struct Collector {
    client: fmp::Client,
    store: Arc<Store>,
    symbols: Vec<String>,
    quote_refresh: Duration,
    slow_refresh: Duration,
}

impl Collector {
    pub fn new(
        client: fmp::Client,
        store: Arc<Store>,
        symbols: Vec<String>,
        quote_refresh: Duration,
        slow_refresh: Duration,
    ) -> Self {
        Self {
            client,
            store,
            symbols,
            quote_refresh,
            slow_refresh,
        }
    }

    pub async fn run_with_backfill(self) {
        self.backfill_missing().await;
        let mut ticker = tokio::time::interval(self.quote_refresh);
        ticker.set_missed_tick_behavior(tokio::time::MissedTickBehavior::Delay);
        loop {
            ticker.tick().await;
            self.refresh_tick(Utc::now()).await;
        }
    }

    /// Fetch every dataset that has no stored copy yet (or an unreadable one).
    pub async fn backfill_missing(&self) {
        for symbol in &self.symbols {
            for dataset in Dataset::ALL {
                match self.store.read(symbol, dataset) {
                    Ok(Some(_)) => continue,
                    Ok(None) => {}
                    Err(error) => {
                        warn!(
                            symbol,
                            dataset = %dataset,
                            error = format!("{error:#}"),
                            "stored file unreadable; refetching"
                        );
                    }
                }
                self.fetch_and_store(symbol, dataset, "backfill").await;
            }
        }
    }

    /// One refresh pass: quotes on the fast cadence, the slow datasets only
    /// once their stored copy ages out.
    pub async fn refresh_tick(&self, now: DateTime<Utc>) {
        // Slightly under the tick interval so the age check passes on the
        // tick that was scheduled to refresh it.
        let quote_threshold = self.quote_refresh.mul_f64(0.9);
        for symbol in &self.symbols {
            if self.is_stale(symbol, Dataset::Quote, quote_threshold, now) {
                self.fetch_and_store(symbol, Dataset::Quote, "scheduled")
                    .await;
            }
            for dataset in SLOW_DATASETS {
                if self.is_stale(symbol, dataset, self.slow_refresh, now) {
                    self.fetch_and_store(symbol, dataset, "scheduled").await;
                }
            }
        }
    }

    fn is_stale(
        &self,
        symbol: &str,
        dataset: Dataset,
        threshold: Duration,
        now: DateTime<Utc>,
    ) -> bool {
        match self.store.read(symbol, dataset) {
            Ok(Some(envelope)) => is_older_than(&envelope, threshold, now),
            Ok(None) => true,
            Err(error) => {
                warn!(
                    symbol,
                    dataset = %dataset,
                    error = format!("{error:#}"),
                    "stored file unreadable; refetching"
                );
                true
            }
        }
    }

    async fn fetch_and_store(&self, symbol: &str, dataset: Dataset, mode: &str) {
        match self.client.fetch(dataset, symbol).await {
            Ok(payload) => {
                if let Err(error) = self
                    .store
                    .write(symbol, dataset, &Envelope::from_fmp(payload))
                {
                    warn!(
                        symbol,
                        dataset = %dataset,
                        mode,
                        error = format!("{error:#}"),
                        "store write failed"
                    );
                } else {
                    info!(symbol, dataset = %dataset, mode, "collected");
                }
            }
            Err(error) => {
                warn!(
                    symbol,
                    dataset = %dataset,
                    mode,
                    error = format!("{error:#}"),
                    "collection failed"
                );
            }
        }
    }
}

fn is_older_than(envelope: &Envelope, threshold: Duration, now: DateTime<Utc>) -> bool {
    let age = now.signed_duration_since(envelope.fetched_at);
    match age.to_std() {
        Ok(age) => age >= threshold,
        // fetched_at in the future (clock skew): treat as fresh.
        Err(_) => false,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::routing::get;
    use axum::{Json, Router};
    use serde_json::json;

    #[test]
    fn age_comparison_handles_fresh_stale_and_skew() {
        let now: DateTime<Utc> = "2026-07-11T12:00:00Z".parse().unwrap();
        let envelope_at = |timestamp: &str| Envelope {
            fetched_at: timestamp.parse().unwrap(),
            source: "fmp".to_string(),
            payload: json!([]),
        };

        let hour = Duration::from_secs(3600);
        assert!(!is_older_than(
            &envelope_at("2026-07-11T11:30:00Z"),
            hour,
            now
        ));
        assert!(is_older_than(
            &envelope_at("2026-07-11T10:00:00Z"),
            hour,
            now
        ));
        assert!(!is_older_than(
            &envelope_at("2026-07-11T13:00:00Z"),
            hour,
            now
        ));
    }

    #[tokio::test]
    async fn backfill_fetches_only_missing_datasets() {
        let router = Router::new()
            .route("/quote", get(|| async { Json(json!([{"price": 1.0}])) }))
            .route("/profile", get(|| async { Json(json!([{"sector": "X"}])) }))
            .route(
                "/income-statement",
                get(|| async { Json(json!([{"epsDiluted": 1.0}])) }),
            )
            .route(
                "/dividends",
                get(|| async { Json(json!([{"date": "2026-01-01"}])) }),
            );
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let base = format!("http://{}", listener.local_addr().unwrap());
        tokio::spawn(async move { axum::serve(listener, router).await.unwrap() });

        let dir = tempfile::tempdir().unwrap();
        let store = Arc::new(Store::new(dir.path()));
        // Pre-seed the quote with a marker payload; backfill must not touch it.
        store
            .write(
                "AAPL",
                Dataset::Quote,
                &Envelope::from_fmp(json!([{"price": 42.0}])),
            )
            .unwrap();

        let client = fmp::Client::new(base, "k".into()).unwrap();
        let collector = Collector::new(
            client,
            store.clone(),
            vec!["AAPL".to_string()],
            Duration::from_secs(900),
            Duration::from_secs(86400),
        );
        collector.backfill_missing().await;

        let quote = store.read("AAPL", Dataset::Quote).unwrap().unwrap();
        assert_eq!(
            quote.payload,
            json!([{"price": 42.0}]),
            "pre-seeded quote untouched"
        );
        for dataset in SLOW_DATASETS {
            assert!(
                store.read("AAPL", dataset).unwrap().is_some(),
                "{dataset} backfilled"
            );
        }
    }
}
