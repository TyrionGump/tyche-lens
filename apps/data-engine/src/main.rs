use std::sync::Arc;

use anyhow::{Context, Result};
use tracing_subscriber::EnvFilter;

use tyche_data_engine_rust::collect::{Collector, fmp};
use tyche_data_engine_rust::config::Config;
use tyche_data_engine_rust::serve;
use tyche_data_engine_rust::store::Store;

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::try_from_default_env().unwrap_or_else(|_| EnvFilter::new("info")),
        )
        .init();

    let config = Config::from_env()?;
    let store = Arc::new(Store::new(&config.data_dir));
    let client = fmp::Client::new(config.fmp_base_url.clone(), config.fmp_api_key.clone())?;
    let collector = Collector::new(
        client,
        store.clone(),
        config.symbols.clone(),
        config.quote_refresh,
        config.slow_refresh,
    );
    tokio::spawn(collector.run_with_backfill());

    let listener = tokio::net::TcpListener::bind(&config.listen_addr)
        .await
        .with_context(|| format!("bind {}", config.listen_addr))?;
    tracing::info!(
        addr = %config.listen_addr,
        symbols = ?config.symbols,
        data_dir = %config.data_dir.display(),
        "tyche-data-engine-rust listening"
    );
    axum::serve(listener, serve::router(store))
        .with_graceful_shutdown(shutdown_signal())
        .await
        .context("serve read API")?;
    Ok(())
}

async fn shutdown_signal() {
    let _ = tokio::signal::ctrl_c().await;
    tracing::info!("shutting down");
}
