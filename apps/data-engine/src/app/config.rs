use std::net::SocketAddr;
use std::path::{Path, PathBuf};
use std::time::Duration;

use anyhow::{Context, Result, bail};

const DEFAULT_SYMBOLS: &str = "AAPL,MSFT";
const DEFAULT_LISTEN_ADDR: &str = "127.0.0.1:8090";
const DEFAULT_DATA_FILE: &str = "./data/quotes.json";
const DEFAULT_FMP_BASE_URL: &str = "https://financialmodelingprep.com/stable";
const DEFAULT_REFRESH_MINUTES: u64 = 15;

pub(super) struct Config {
    fmp_api_key: String,
    fmp_base_url: String,
    symbols: Vec<String>,
    listen_addr: SocketAddr,
    data_file: PathBuf,
    refresh_interval: Duration,
}

impl Config {
    pub(super) fn from_env() -> Result<Self> {
        Self::from_lookup(&|name| std::env::var(name).ok())
    }

    pub(super) fn fmp_api_key(&self) -> &str {
        &self.fmp_api_key
    }

    pub(super) fn fmp_base_url(&self) -> &str {
        &self.fmp_base_url
    }

    pub(super) fn symbols(&self) -> &[String] {
        &self.symbols
    }

    pub(super) fn listen_addr(&self) -> SocketAddr {
        self.listen_addr
    }

    pub(super) fn data_file(&self) -> &Path {
        &self.data_file
    }

    pub(super) fn refresh_interval(&self) -> Duration {
        self.refresh_interval
    }

    fn from_lookup(lookup: &impl Fn(&str) -> Option<String>) -> Result<Self> {
        let fmp_api_key = lookup("FMP_API_KEY")
            .map(|value| value.trim().to_owned())
            .filter(|value| !value.is_empty())
            .context("FMP_API_KEY is required")?;

        let fmp_base_url = lookup("FMP_BASE_URL")
            .unwrap_or_else(|| DEFAULT_FMP_BASE_URL.to_owned())
            .trim_end_matches('/')
            .to_owned();

        if fmp_base_url.is_empty() {
            bail!("FMP_BASE_URL must not be empty");
        }

        let symbols =
            parse_symbols(&lookup("SYMBOLS").unwrap_or_else(|| DEFAULT_SYMBOLS.to_owned()))?;

        let listen_addr = lookup("LISTEN_ADDR")
            .unwrap_or_else(|| DEFAULT_LISTEN_ADDR.to_owned())
            .parse()
            .context("LISTEN_ADDR must be a socket address such as 127.0.0.1:8090")?;

        let data_file =
            PathBuf::from(lookup("DATA_FILE").unwrap_or_else(|| DEFAULT_DATA_FILE.to_owned()));
        if data_file.as_os_str().is_empty() {
            bail!("DATA_FILE must not be empty");
        }

        let refresh_minutes = match lookup("QUOTE_REFRESH_MINUTES") {
            Some(raw) => parse_positive_number(&raw, "QUOTE_REFRESH_MINUTES")?,
            None => DEFAULT_REFRESH_MINUTES,
        };
        let refresh_seconds = refresh_minutes
            .checked_mul(60)
            .context("QUOTE_REFRESH_MINUTES is too large")?;

        Ok(Self {
            fmp_api_key,
            fmp_base_url,
            symbols,
            listen_addr,
            data_file,
            refresh_interval: Duration::from_secs(refresh_seconds),
        })
    }
}

fn parse_symbols(raw: &str) -> Result<Vec<String>> {
    let mut symbols = Vec::new();

    for value in raw.split(',') {
        let symbol = value.trim().to_uppercase();
        if symbol.is_empty() {
            continue;
        }
        if !is_valid_symbol(&symbol) {
            bail!("invalid symbol in SYMBOLS: {value:?}");
        }
        if !symbols.contains(&symbol) {
            symbols.push(symbol);
        }
    }

    if symbols.is_empty() {
        bail!("SYMBOLS must contain at least one symbol");
    }

    Ok(symbols)
}

fn is_valid_symbol(symbol: &str) -> bool {
    let mut characters = symbol.chars();
    let Some(first) = characters.next() else {
        return false;
    };

    symbol.len() <= 10
        && first.is_ascii_uppercase()
        && characters.all(|character| {
            character.is_ascii_uppercase()
                || character.is_ascii_digit()
                || matches!(character, '.' | '-')
        })
}

fn parse_positive_number(raw: &str, name: &str) -> Result<u64> {
    let value = raw
        .trim()
        .parse()
        .with_context(|| format!("{name} must be a positive integer, got {raw:?}"))?;

    if value == 0 {
        bail!("{name} must be greater than zero");
    }

    Ok(value)
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use super::*;

    fn lookup(values: &[(&str, &str)]) -> impl Fn(&str) -> Option<String> {
        let values: HashMap<String, String> = values
            .iter()
            .map(|(name, value)| (name.to_string(), value.to_string()))
            .collect();

        move |name| values.get(name).cloned()
    }

    #[test]
    fn applies_defaults() {
        let config = Config::from_lookup(&lookup(&[("FMP_API_KEY", "test-key")])).unwrap();

        assert_eq!(config.symbols, ["AAPL", "MSFT"]);
        assert_eq!(config.listen_addr.to_string(), DEFAULT_LISTEN_ADDR);
        assert_eq!(config.data_file, PathBuf::from(DEFAULT_DATA_FILE));
        assert_eq!(config.refresh_interval, Duration::from_secs(15 * 60));
    }

    #[test]
    fn normalizes_and_deduplicates_symbols() {
        let config = Config::from_lookup(&lookup(&[
            ("FMP_API_KEY", "test-key"),
            ("SYMBOLS", " aapl, MSFT, aapl "),
        ]))
        .unwrap();

        assert_eq!(config.symbols, ["AAPL", "MSFT"]);
    }

    #[test]
    fn rejects_missing_secrets_and_invalid_values() {
        assert!(Config::from_lookup(&lookup(&[])).is_err());
        assert!(
            Config::from_lookup(&lookup(&[
                ("FMP_API_KEY", "test-key"),
                ("SYMBOLS", "../AAPL"),
            ]))
            .is_err()
        );
        assert!(
            Config::from_lookup(&lookup(&[
                ("FMP_API_KEY", "test-key"),
                ("QUOTE_REFRESH_MINUTES", "0"),
            ]))
            .is_err()
        );
        assert!(
            Config::from_lookup(&lookup(&[("FMP_API_KEY", "test-key"), ("DATA_FILE", "")]))
                .is_err()
        );
    }
}
