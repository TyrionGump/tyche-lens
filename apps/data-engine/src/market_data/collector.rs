use std::collections::BTreeMap;
use std::time::Duration;

use anyhow::Result;
use tokio::time::sleep;
use tracing::{info, warn};

use super::fmp::FmpClient;
use super::quote::Quote;
use super::store::QuoteStore;

/// Refresh forever, waiting one full interval after each completed refresh.
pub(super) async fn run(
    client: FmpClient,
    store: QuoteStore,
    symbols: Vec<String>,
    refresh_interval: Duration,
) {
    loop {
        if let Err(error) = refresh(&client, &store, &symbols).await {
            warn!(error = format!("{error:#}"), "quote refresh failed");
        }

        sleep(refresh_interval).await;
    }
}

/// Fetch every configured symbol once and persist one coherent snapshot.
///
/// A failed request retains that symbol's last stored quote. Symbols removed
/// from configuration are removed from the next snapshot.
async fn refresh(client: &FmpClient, store: &QuoteStore, symbols: &[String]) -> Result<()> {
    let previous_quotes: BTreeMap<String, Quote> = store
        .load()
        .await?
        .into_iter()
        .map(|quote| (quote.symbol().to_owned(), quote))
        .collect();
    let mut next_quotes = BTreeMap::new();

    for symbol in symbols {
        match client.fetch_quote(symbol).await {
            Ok(quote) => {
                info!(symbol, price = quote.price(), "quote collected");
                next_quotes.insert(symbol.clone(), quote);
            }
            Err(error) => {
                warn!(
                    symbol,
                    error = format!("{error:#}"),
                    "quote collection failed"
                );
                if let Some(previous_quote) = previous_quotes.get(symbol) {
                    next_quotes.insert(symbol.clone(), previous_quote.clone());
                }
            }
        }
    }

    let quotes: Vec<Quote> = next_quotes.into_values().collect();
    store.save(&quotes).await?;
    info!(quote_count = quotes.len(), "quote snapshot stored");

    Ok(())
}
