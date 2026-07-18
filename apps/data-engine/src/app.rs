use anyhow::{Context, Result};

use crate::market_data::QuotePipeline;

use self::config::Config;

mod config;
mod http_api;

pub(super) async fn run_from_env() -> Result<()> {
    run(Config::from_env()?).await
}

async fn run(config: Config) -> Result<()> {
    let quote_pipeline = QuotePipeline::new(
        config.fmp_base_url(),
        config.fmp_api_key(),
        config.data_file(),
        config.symbols().to_vec(),
        config.refresh_interval(),
    )?;
    let quote_reader = quote_pipeline.reader();
    let collector_task = tokio::spawn(quote_pipeline.run());

    let listener = tokio::net::TcpListener::bind(config.listen_addr())
        .await
        .with_context(|| format!("bind {}", config.listen_addr()))?;

    tracing::info!(
        address = %config.listen_addr(),
        symbols = ?config.symbols(),
        data_file = %config.data_file().display(),
        "data engine listening"
    );

    let server_result = axum::serve(listener, http_api::router(quote_reader))
        .with_graceful_shutdown(shutdown_signal())
        .await;

    collector_task.abort();
    server_result.context("serve HTTP API")
}

async fn shutdown_signal() {
    if let Err(error) = tokio::signal::ctrl_c().await {
        tracing::warn!(%error, "failed to listen for shutdown signal");
    }
}
