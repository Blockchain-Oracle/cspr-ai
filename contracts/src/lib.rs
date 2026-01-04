//! CSPR.AI Smart Contracts
//!
//! This crate contains smart contracts for the CSPR.AI platform, designed
//! following Casper CEP standards and Odra framework best practices.
//!
//! ## Contracts
//!
//! - `token` - Generic CEP-18 fungible token (user-configurable name, symbol, supply)
//! - `nft` - Generic NFT collection with token_uri support (CEP-78/ERC-721 compatible)
//! - `dao` - Governance DAO with proposal and voting
//! - `dex` - AMM DEX for token swaps
//!
//! ## Usage
//!
//! Each contract is designed to be deployed by users with their own parameters.
//! For example, to create a custom token:
//!
//! ```ignore
//! // Deploy with custom parameters
//! Cep18Token::deploy(&env, Cep18TokenInitArgs {
//!     name: "My Token".to_string(),
//!     symbol: "MTK".to_string(),
//!     decimals: 9,
//!     initial_supply: U256::from(1_000_000u64),
//!     enable_minting: true,
//! });
//! ```

#![no_std]

extern crate alloc;

pub mod token;
pub mod nft;
pub mod dao;
pub mod dex;

// Re-export main contract types for convenience
pub use token::Cep18Token;
pub use nft::NftCollection;

// Type aliases to match Odra.toml contract names
pub use token::Cep18Token as CsprAiToken;
pub use nft::NftCollection as CsprAiNFT;
