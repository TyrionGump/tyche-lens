//! The read path: a read-only HTTP API over the file store. Handlers never
//! call FMP; snapshot assembly (including derived metrics) happens here, at
//! serve time.

mod snapshot;

use std::sync::Arc;

use axum::extract::{Path, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use chrono::Utc;
use serde_json::json;
use tracing::warn;

use self::snapshot::build_snapshot;
use crate::domain::{Dataset, symbol};
use crate::store::Store;

pub fn router(store: Arc<Store>) -> Router {
    Router::new()
        .route("/healthz", get(|| async { "ok" }))
        .route("/v1/symbols", get(list_symbols))
        .route("/v1/symbols/{symbol}/snapshot", get(symbol_snapshot))
        .with_state(store)
}

async fn list_symbols(State(store): State<Arc<Store>>) -> Response {
    match store.list_symbols() {
        Ok(symbols) => Json(json!({ "symbols": symbols })).into_response(),
        Err(error) => {
            warn!(error = format!("{error:#}"), "list symbols failed");
            error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "internal",
                "failed to list symbols",
            )
        }
    }
}

async fn symbol_snapshot(State(store): State<Arc<Store>>, Path(symbol): Path<String>) -> Response {
    let symbol = symbol.trim().to_uppercase();
    if !symbol::is_valid(&symbol) {
        return error_response(
            StatusCode::BAD_REQUEST,
            "invalid_symbol",
            "symbol has an invalid format",
        );
    }

    let quote = match store.read(&symbol, Dataset::Quote) {
        Ok(Some(envelope)) => envelope,
        Ok(None) => {
            return error_response(
                StatusCode::NOT_FOUND,
                "unknown_symbol",
                "symbol is not in the store",
            );
        }
        Err(error) => {
            warn!(symbol, error = format!("{error:#}"), "read quote failed");
            return error_response(
                StatusCode::INTERNAL_SERVER_ERROR,
                "internal",
                "failed to read stored quote",
            );
        }
    };

    let read_optional = |dataset: Dataset| match store.read(&symbol, dataset) {
        Ok(envelope) => envelope,
        Err(error) => {
            warn!(
                symbol,
                dataset = %dataset,
                error = format!("{error:#}"),
                "read dataset failed; serving without it"
            );
            None
        }
    };
    let profile = read_optional(Dataset::Profile);
    let income = read_optional(Dataset::IncomeQuarterly);
    let dividends = read_optional(Dataset::Dividends);

    Json(build_snapshot(
        &symbol,
        &quote,
        profile.as_ref(),
        income.as_ref(),
        dividends.as_ref(),
        Utc::now(),
    ))
    .into_response()
}

fn error_response(status: StatusCode, code: &str, message: &str) -> Response {
    (status, Json(json!({ "code": code, "message": message }))).into_response()
}
