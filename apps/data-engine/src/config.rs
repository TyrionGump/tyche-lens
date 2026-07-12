use std::path::PathBuf;
use std::time::Duration;

use anyhow::{Context, Result, bail};

use crate::domain::symbol;

const DEFAULT_SYMBOLS: &str = "AAPL,NVDA,TSLA,MSFT,AMZN";
const DEFAULT_LISTEN_ADDR: &str = "127.0.0.1:8090";
const DEFAULT_DATA_DIR: &str = "./data";
const DEFAULT_FMP_BASE_URL: &str = "https://financialmodelingprep.com/stable";
const DEFAULT_QUOTE_REFRESH_MINUTES: u64 = 15;
const DEFAULT_SLOW_REFRESH_HOURS: u64 = 24;

#[derive(Clone)]
pub struct Config {
    pub fmp_api_key: String,
    pub fmp_base_url: String,
    pub symbols: Vec<String>,
    pub listen_addr: String,
    pub data_dir: PathBuf,
    pub quote_refresh: Duration,
    pub slow_refresh: Duration,
}

/// Manual impl so accidental `{:?}` logging never prints the API key.
impl std::fmt::Debug for Config {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Config")
            .field("fmp_api_key", &"<redacted>")
            .field("fmp_base_url", &self.fmp_base_url)
            .field("symbols", &self.symbols)
            .field("listen_addr", &self.listen_addr)
            .field("data_dir", &self.data_dir)
            .field("quote_refresh", &self.quote_refresh)
            .field("slow_refresh", &self.slow_refresh)
            .finish()
    }
}

impl Config {
    pub fn from_env() -> Result<Self> {
        Self::from_lookup(&|name| std::env::var(name).ok())
    }

    pub fn from_lookup(lookup: &dyn Fn(&str) -> Option<String>) -> Result<Self> {
        let fmp_api_key = lookup("FMP_API_KEY")
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .context("FMP_API_KEY is required")?;

        let fmp_base_url = lookup("FMP_BASE_URL")
            .unwrap_or_else(|| DEFAULT_FMP_BASE_URL.to_string())
            .trim_end_matches('/')
            .to_string();

        let symbols =
            parse_symbols(&lookup("SYMBOLS").unwrap_or_else(|| DEFAULT_SYMBOLS.to_string()))?;

        let listen_addr = lookup("LISTEN_ADDR").unwrap_or_else(|| DEFAULT_LISTEN_ADDR.to_string());

        let data_dir =
            PathBuf::from(lookup("DATA_DIR").unwrap_or_else(|| DEFAULT_DATA_DIR.to_string()));

        let quote_refresh_minutes = parse_positive(
            lookup("QUOTE_REFRESH_MINUTES"),
            "QUOTE_REFRESH_MINUTES",
            DEFAULT_QUOTE_REFRESH_MINUTES,
        )?;
        let slow_refresh_hours = parse_positive(
            lookup("SLOW_REFRESH_HOURS"),
            "SLOW_REFRESH_HOURS",
            DEFAULT_SLOW_REFRESH_HOURS,
        )?;

        Ok(Self {
            fmp_api_key,
            fmp_base_url,
            symbols,
            listen_addr,
            data_dir,
            quote_refresh: Duration::from_secs(quote_refresh_minutes * 60),
            slow_refresh: Duration::from_secs(slow_refresh_hours * 3600),
        })
    }
}

fn parse_symbols(raw: &str) -> Result<Vec<String>> {
    let mut symbols = Vec::new();
    for part in raw.split(',') {
        let normalized = part.trim().to_uppercase();
        if normalized.is_empty() {
            continue;
        }
        if !symbol::is_valid(&normalized) {
            bail!("invalid symbol in SYMBOLS: {part:?}");
        }
        if !symbols.contains(&normalized) {
            symbols.push(normalized);
        }
    }
    if symbols.is_empty() {
        bail!("SYMBOLS must contain at least one symbol");
    }
    Ok(symbols)
}

fn parse_positive(value: Option<String>, name: &str, default: u64) -> Result<u64> {
    match value {
        None => Ok(default),
        Some(raw) => {
            let parsed: u64 = raw
                .trim()
                .parse()
                .with_context(|| format!("{name} must be a positive integer, got {raw:?}"))?;
            if parsed == 0 {
                bail!("{name} must be greater than zero");
            }
            Ok(parsed)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::collections::HashMap;

    fn lookup(pairs: &[(&str, &str)]) -> impl Fn(&str) -> Option<String> {
        let map: HashMap<String, String> = pairs
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect();
        move |name: &str| map.get(name).cloned()
    }

    #[test]
    fn applies_defaults() {
        let config = Config::from_lookup(&lookup(&[("FMP_API_KEY", "test-key")])).unwrap();
        assert_eq!(config.fmp_api_key, "test-key");
        assert_eq!(config.fmp_base_url, DEFAULT_FMP_BASE_URL);
        assert_eq!(config.symbols, ["AAPL", "NVDA", "TSLA", "MSFT", "AMZN"]);
        assert_eq!(config.listen_addr, DEFAULT_LISTEN_ADDR);
        assert_eq!(config.quote_refresh, Duration::from_secs(15 * 60));
        assert_eq!(config.slow_refresh, Duration::from_secs(24 * 3600));
    }

    #[test]
    fn requires_api_key() {
        assert!(Config::from_lookup(&lookup(&[])).is_err());
        assert!(Config::from_lookup(&lookup(&[("FMP_API_KEY", "  ")])).is_err());
    }

    #[test]
    fn normalizes_and_dedupes_symbols() {
        let config = Config::from_lookup(&lookup(&[
            ("FMP_API_KEY", "k"),
            ("SYMBOLS", " aapl, MSFT ,aapl,, brk.b "),
        ]))
        .unwrap();
        assert_eq!(config.symbols, ["AAPL", "MSFT", "BRK.B"]);
    }

    #[test]
    fn debug_output_redacts_the_api_key() {
        let config = Config::from_lookup(&lookup(&[("FMP_API_KEY", "super-secret")])).unwrap();
        let printed = format!("{config:?}");
        assert!(!printed.contains("super-secret"), "printed: {printed}");
        assert!(printed.contains("<redacted>"));
    }

    #[test]
    fn rejects_invalid_symbols_and_intervals() {
        assert!(
            Config::from_lookup(&lookup(&[("FMP_API_KEY", "k"), ("SYMBOLS", "../etc")])).is_err()
        );
        assert!(Config::from_lookup(&lookup(&[("FMP_API_KEY", "k"), ("SYMBOLS", " , ")])).is_err());
        assert!(
            Config::from_lookup(&lookup(&[
                ("FMP_API_KEY", "k"),
                ("QUOTE_REFRESH_MINUTES", "0")
            ]))
            .is_err()
        );
    }
}
