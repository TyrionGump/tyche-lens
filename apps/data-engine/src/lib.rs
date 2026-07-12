//! Minimal demo of the tyche watchlist data flow: scheduled FMP collection
//! into a local file store, served over a small read-only HTTP API so
//! consumers query the store instead of the provider.
//!
//! The module tree mirrors that flow:
//!
//! ```text
//! FMP ──> collect ──> store ──> serve ──> HTTP consumers
//!        (write path)  (seam)  (read path)
//!
//! domain — vocabulary shared by both paths (Dataset, symbol rules)
//! config — environment wiring, assembled by the thin `main` binary
//! ```
//!
//! See `README.md` for scope and deliberate non-goals.

pub mod collect;
pub mod config;
pub mod domain;
pub mod serve;
pub mod store;
