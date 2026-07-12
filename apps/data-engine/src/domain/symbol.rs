//! The symbol invariant shared by config parsing and the read API.

/// Symbols become file-system path segments under the store root, so they
/// are restricted to uppercase alphanumerics plus `.`, `-`, `^` — and must
/// contain at least one alphanumeric, so dot-only inputs like `..` can never
/// escape the store directory.
pub fn is_valid(symbol: &str) -> bool {
    symbol.len() <= 12
        && symbol
            .chars()
            .all(|c| c.is_ascii_uppercase() || c.is_ascii_digit() || matches!(c, '.' | '-' | '^'))
        && symbol.chars().any(|c| c.is_ascii_alphanumeric())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn accepts_real_symbol_shapes() {
        for symbol in ["AAPL", "BRK.B", "BF-B", "^GSPC", "MSFT0"] {
            assert!(is_valid(symbol), "{symbol} should be valid");
        }
    }

    #[test]
    fn rejects_empty_lowercase_oversized_and_path_escapes() {
        for symbol in [
            "",
            "aapl",
            "AA PL",
            "AAPLAAPLAAPLX",
            ".",
            "..",
            "../X",
            "A/B",
        ] {
            assert!(!is_valid(symbol), "{symbol:?} should be invalid");
        }
    }
}
