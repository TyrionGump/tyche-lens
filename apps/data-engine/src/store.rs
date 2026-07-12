use std::fs;
use std::io::ErrorKind;
use std::path::PathBuf;

use anyhow::{Context, Result};
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::domain::Dataset;

/// Collection metadata plus the unmodified FMP JSON response.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Envelope {
    pub fetched_at: DateTime<Utc>,
    pub source: String,
    pub payload: Value,
}

impl Envelope {
    pub fn from_fmp(payload: Value) -> Self {
        Self {
            fetched_at: Utc::now(),
            source: "fmp".to_string(),
            payload,
        }
    }
}

/// File store rooted at `data/`, one directory per symbol, one JSON file per
/// dataset. Writes go to a same-directory temporary file followed by a rename.
pub struct Store {
    root: PathBuf,
}

impl Store {
    pub fn new(root: impl Into<PathBuf>) -> Self {
        Self { root: root.into() }
    }

    pub fn write(&self, symbol: &str, dataset: Dataset, envelope: &Envelope) -> Result<()> {
        let dir = self.root.join(symbol);
        fs::create_dir_all(&dir)
            .with_context(|| format!("create data directory {}", dir.display()))?;
        let final_path = dir.join(format!("{}.json", dataset.file_stem()));
        let tmp_path = dir.join(format!(".{}.json.tmp", dataset.file_stem()));
        let bytes = serde_json::to_vec_pretty(envelope).context("encode envelope")?;
        fs::write(&tmp_path, bytes)
            .with_context(|| format!("write temporary file {}", tmp_path.display()))?;
        fs::rename(&tmp_path, &final_path)
            .with_context(|| format!("replace {}", final_path.display()))?;
        Ok(())
    }

    pub fn read(&self, symbol: &str, dataset: Dataset) -> Result<Option<Envelope>> {
        let path = self
            .root
            .join(symbol)
            .join(format!("{}.json", dataset.file_stem()));
        let bytes = match fs::read(&path) {
            Ok(bytes) => bytes,
            Err(error) if error.kind() == ErrorKind::NotFound => return Ok(None),
            Err(error) => {
                return Err(error).with_context(|| format!("read {}", path.display()));
            }
        };
        let envelope =
            serde_json::from_slice(&bytes).with_context(|| format!("decode {}", path.display()))?;
        Ok(Some(envelope))
    }

    /// Symbols present in the store: one directory per symbol.
    pub fn list_symbols(&self) -> Result<Vec<String>> {
        let entries = match fs::read_dir(&self.root) {
            Ok(entries) => entries,
            Err(error) if error.kind() == ErrorKind::NotFound => return Ok(Vec::new()),
            Err(error) => {
                return Err(error).with_context(|| format!("list {}", self.root.display()));
            }
        };
        let mut symbols = Vec::new();
        for entry in entries {
            let entry = entry.context("read store entry")?;
            if entry.file_type().context("stat store entry")?.is_dir() {
                symbols.push(entry.file_name().to_string_lossy().into_owned());
            }
        }
        symbols.sort();
        Ok(symbols)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn round_trips_and_overwrites() {
        let dir = tempfile::tempdir().unwrap();
        let store = Store::new(dir.path());

        assert!(store.read("AAPL", Dataset::Quote).unwrap().is_none());

        store
            .write(
                "AAPL",
                Dataset::Quote,
                &Envelope::from_fmp(json!([{"price": 1.0}])),
            )
            .unwrap();
        let first = store.read("AAPL", Dataset::Quote).unwrap().unwrap();
        assert_eq!(first.payload, json!([{"price": 1.0}]));
        assert_eq!(first.source, "fmp");

        // Overwrite must succeed (rename onto an existing file, Windows included).
        store
            .write(
                "AAPL",
                Dataset::Quote,
                &Envelope::from_fmp(json!([{"price": 2.0}])),
            )
            .unwrap();
        let second = store.read("AAPL", Dataset::Quote).unwrap().unwrap();
        assert_eq!(second.payload, json!([{"price": 2.0}]));
    }

    #[test]
    fn lists_symbol_directories() {
        let dir = tempfile::tempdir().unwrap();
        let store = Store::new(dir.path());
        assert!(store.list_symbols().unwrap().is_empty());

        store
            .write("MSFT", Dataset::Profile, &Envelope::from_fmp(json!([])))
            .unwrap();
        store
            .write("AAPL", Dataset::Quote, &Envelope::from_fmp(json!([])))
            .unwrap();
        assert_eq!(store.list_symbols().unwrap(), ["AAPL", "MSFT"]);
    }

    #[test]
    fn read_reports_corrupt_files() {
        let dir = tempfile::tempdir().unwrap();
        let store = Store::new(dir.path());
        std::fs::create_dir_all(dir.path().join("AAPL")).unwrap();
        std::fs::write(dir.path().join("AAPL").join("quote.json"), b"not json").unwrap();
        assert!(store.read("AAPL", Dataset::Quote).is_err());
    }
}
