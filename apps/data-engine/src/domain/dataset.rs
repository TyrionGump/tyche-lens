//! The per-symbol datasets this service collects — the shared vocabulary of
//! the FMP client (endpoint mapping), the store (file naming), and the
//! collector (refresh policy).

use std::fmt;

/// One collected dataset. Adding a variant forces every exhaustive `match`
/// (FMP endpoint mapping, storage naming) to handle it at compile time.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Dataset {
    Quote,
    Profile,
    IncomeQuarterly,
    Dividends,
}

impl Dataset {
    pub const ALL: [Dataset; 4] = [
        Dataset::Quote,
        Dataset::Profile,
        Dataset::IncomeQuarterly,
        Dataset::Dividends,
    ];

    /// Canonical name: the stem of the storage file (`<stem>.json`) and the
    /// label used in logs.
    pub fn file_stem(self) -> &'static str {
        match self {
            Dataset::Quote => "quote",
            Dataset::Profile => "profile",
            Dataset::IncomeQuarterly => "income-quarterly",
            Dataset::Dividends => "dividends",
        }
    }
}

impl fmt::Display for Dataset {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.file_stem())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names_are_unique_and_display_matches_file_stem() {
        for dataset in Dataset::ALL {
            assert_eq!(dataset.to_string(), dataset.file_stem());
        }
        let mut stems: Vec<&str> = Dataset::ALL.iter().map(|d| d.file_stem()).collect();
        stems.sort();
        stems.dedup();
        assert_eq!(stems.len(), Dataset::ALL.len());
    }
}
