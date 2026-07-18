use std::io::ErrorKind;
use std::path::{Path, PathBuf};

use anyhow::{Context, Result};
use serde::{Deserialize, Serialize};
use tokio::fs;

use super::quote::Quote;

#[derive(Debug, Clone)]
pub(super) struct QuoteStore {
    path: PathBuf,
}

impl QuoteStore {
    pub(super) fn new(path: impl Into<PathBuf>) -> Self {
        Self { path: path.into() }
    }

    pub(super) async fn load(&self) -> Result<Vec<Quote>> {
        let bytes = match fs::read(&self.path).await {
            Ok(bytes) => bytes,
            Err(error) if error.kind() == ErrorKind::NotFound => return Ok(Vec::new()),
            Err(error) => {
                return Err(error)
                    .with_context(|| format!("read quote store {}", self.path.display()));
            }
        };

        let mut snapshot: StoredSnapshot = serde_json::from_slice(&bytes)
            .with_context(|| format!("decode quote store {}", self.path.display()))?;
        snapshot
            .quotes
            .sort_by(|left, right| left.symbol().cmp(right.symbol()));

        Ok(snapshot.quotes)
    }

    pub(super) async fn save(&self, quotes: &[Quote]) -> Result<()> {
        create_parent_directory(&self.path).await?;

        let mut quotes = quotes.to_vec();
        quotes.sort_by(|left, right| left.symbol().cmp(right.symbol()));
        let bytes = serde_json::to_vec_pretty(&StoredSnapshot { quotes })
            .context("encode quote snapshot")?;

        let temporary_path = temporary_path(&self.path)?;
        fs::write(&temporary_path, bytes)
            .await
            .with_context(|| format!("write temporary snapshot {}", temporary_path.display()))?;
        fs::rename(&temporary_path, &self.path)
            .await
            .with_context(|| format!("replace quote store {}", self.path.display()))?;

        Ok(())
    }
}

#[derive(Serialize, Deserialize)]
struct StoredSnapshot {
    quotes: Vec<Quote>,
}

async fn create_parent_directory(path: &Path) -> Result<()> {
    let Some(parent) = path
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
    else {
        return Ok(());
    };

    fs::create_dir_all(parent)
        .await
        .with_context(|| format!("create data directory {}", parent.display()))
}

fn temporary_path(path: &Path) -> Result<PathBuf> {
    let file_name = path
        .file_name()
        .context("DATA_FILE must point to a file")?
        .to_string_lossy();

    Ok(path.with_file_name(format!(".{file_name}.tmp")))
}

#[cfg(test)]
mod tests {
    use chrono::Utc;

    use super::*;

    fn quote(symbol: &str, price: f64) -> Quote {
        Quote::new(
            symbol.to_owned(),
            format!("{symbol} Inc."),
            "NASDAQ".to_owned(),
            price,
            1.0,
            "test".to_owned(),
            Utc::now(),
        )
    }

    #[tokio::test]
    async fn missing_store_is_an_empty_snapshot() {
        let directory = tempfile::tempdir().unwrap();
        let store = QuoteStore::new(directory.path().join("quotes.json"));

        assert!(store.load().await.unwrap().is_empty());
    }

    #[tokio::test]
    async fn saves_replaces_and_sorts_quotes() {
        let directory = tempfile::tempdir().unwrap();
        let store = QuoteStore::new(directory.path().join("nested/quotes.json"));

        store
            .save(&[quote("MSFT", 200.0), quote("AAPL", 100.0)])
            .await
            .unwrap();
        let first = store.load().await.unwrap();
        assert_eq!(first[0].symbol(), "AAPL");
        assert_eq!(first[1].symbol(), "MSFT");

        store.save(&[quote("AAPL", 101.0)]).await.unwrap();
        let second = store.load().await.unwrap();
        assert_eq!(second.len(), 1);
        assert_eq!(second[0].price(), 101.0);
    }
}
