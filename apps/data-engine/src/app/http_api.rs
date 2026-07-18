use axum::extract::State;
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use serde::Serialize;
use tracing::warn;

use crate::market_data::{Quote, QuoteReader};

pub(super) fn router(reader: QuoteReader) -> Router {
    Router::new()
        .route("/healthz", get(|| async { "ok" }))
        .route("/v1/quotes", get(list_quotes))
        .with_state(reader)
}

async fn list_quotes(State(reader): State<QuoteReader>) -> Response {
    match reader.load().await {
        Ok(quotes) => Json(QuotesResponse { quotes }).into_response(),
        Err(error) => {
            warn!(error = format!("{error:#}"), "read quote snapshot failed");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(ErrorResponse {
                    code: "store_unavailable",
                    message: "the quote snapshot could not be read",
                }),
            )
                .into_response()
        }
    }
}

#[derive(Serialize)]
struct QuotesResponse {
    quotes: Vec<Quote>,
}

#[derive(Serialize)]
struct ErrorResponse {
    code: &'static str,
    message: &'static str,
}

#[cfg(test)]
mod tests {
    use std::path::Path;
    use std::time::Duration;

    use axum::body::{Body, to_bytes};
    use axum::http::{Request, StatusCode};
    use serde_json::Value;
    use tower::ServiceExt;

    use super::*;
    use crate::market_data::QuotePipeline;

    #[tokio::test]
    async fn serves_health_and_the_stored_quote_snapshot() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("quotes.json");
        write_quote_snapshot(&path, "AAPL", 123.45).await;
        let app = router(quote_reader(&path));

        let health = app.clone().oneshot(request("/healthz")).await.unwrap();
        assert_eq!(health.status(), StatusCode::OK);

        let response = app.oneshot(request("/v1/quotes")).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);

        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let json: Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["quotes"][0]["symbol"], "AAPL");
        assert_eq!(json["quotes"][0]["price"], 123.45);
    }

    #[tokio::test]
    async fn returns_an_empty_list_before_the_first_collection() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("quotes.json");

        let response = router(quote_reader(&path))
            .oneshot(request("/v1/quotes"))
            .await
            .unwrap();
        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let json: Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(json["quotes"], serde_json::json!([]));
    }

    #[tokio::test]
    async fn reports_an_unreadable_snapshot_without_exposing_details() {
        let directory = tempfile::tempdir().unwrap();
        let path = directory.path().join("quotes.json");
        tokio::fs::write(&path, "not JSON").await.unwrap();

        let response = router(quote_reader(&path))
            .oneshot(request("/v1/quotes"))
            .await
            .unwrap();
        let status = response.status();
        let body = to_bytes(response.into_body(), usize::MAX).await.unwrap();
        let json: Value = serde_json::from_slice(&body).unwrap();

        assert_eq!(status, StatusCode::INTERNAL_SERVER_ERROR);
        assert_eq!(json["code"], "store_unavailable");
        assert!(!json["message"].as_str().unwrap().contains("quotes.json"));
    }

    fn request(uri: &str) -> Request<Body> {
        Request::builder().uri(uri).body(Body::empty()).unwrap()
    }

    fn quote_reader(path: &Path) -> QuoteReader {
        QuotePipeline::new(
            "https://example.com",
            "test-key",
            path,
            vec!["AAPL".to_owned()],
            Duration::from_secs(60),
        )
        .unwrap()
        .reader()
    }

    async fn write_quote_snapshot(path: &Path, symbol: &str, price: f64) {
        let snapshot = serde_json::json!({
            "quotes": [{
                "symbol": symbol,
                "name": "Example Inc.",
                "exchange": "NASDAQ",
                "price": price,
                "change_percent": 1.25,
                "source": "test",
                "fetched_at": "2026-07-18T03:00:00Z"
            }]
        });

        tokio::fs::write(path, serde_json::to_vec(&snapshot).unwrap())
            .await
            .unwrap();
    }
}
