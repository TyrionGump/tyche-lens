//! Vocabulary shared by the write path (`collect`) and the read path
//! (`serve`): which datasets exist per symbol, and what a valid symbol is.

pub mod dataset;
pub mod symbol;

pub use dataset::Dataset;
