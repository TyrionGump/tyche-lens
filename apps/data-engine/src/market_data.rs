use std::path::PathBuf;
use std::time::Duration;

use anyhow::Result;

use self::fmp::FmpClient;
use self::store::QuoteStore;

mod collector;
mod fmp;
mod quote;
mod store;

pub(crate) use quote::Quote;

pub(crate) struct QuotePipeline {
    client: FmpClient,
    store: QuoteStore,
    symbols: Vec<String>,
    refresh_interval: Duration,
}

impl QuotePipeline {
    pub(crate) fn new(
        base_url: &str,
        api_key: &str,
        data_file: impl Into<PathBuf>,
        symbols: Vec<String>,
        refresh_interval: Duration,
    ) -> Result<Self> {
        Ok(Self {
            client: FmpClient::new(base_url, api_key)?,
            store: QuoteStore::new(data_file),
            symbols,
            refresh_interval,
        })
    }

    pub(crate) fn reader(&self) -> QuoteReader {
        QuoteReader {
            store: self.store.clone(),
        }
    }

    pub(crate) async fn run(self) {
        collector::run(self.client, self.store, self.symbols, self.refresh_interval).await;
    }
}

#[derive(Clone)]
pub(crate) struct QuoteReader {
    store: QuoteStore,
}

impl QuoteReader {
    pub(crate) async fn load(&self) -> Result<Vec<Quote>> {
        self.store.load().await
    }
}
