pub mod classify;
#[cfg(test)]
mod tests;

pub use classify::{Platform, classify_asset};
