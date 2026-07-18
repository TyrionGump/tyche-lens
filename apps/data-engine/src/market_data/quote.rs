use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};

/// The provider-independent quote stored and returned by this service.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub(crate) struct Quote {
    symbol: String,
    name: String,
    exchange: String,
    price: f64,
    change_percent: f64,
    source: String,
    fetched_at: DateTime<Utc>,
}

impl Quote {
    pub(super) fn new(
        symbol: String,
        name: String,
        exchange: String,
        price: f64,
        change_percent: f64,
        source: String,
        fetched_at: DateTime<Utc>,
    ) -> Self {
        Self {
            symbol,
            name,
            exchange,
            price,
            change_percent,
            source,
            fetched_at,
        }
    }

    pub(super) fn symbol(&self) -> &str {
        &self.symbol
    }

    pub(super) fn price(&self) -> f64 {
        self.price
    }
}
