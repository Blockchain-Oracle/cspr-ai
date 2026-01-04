//! Deploy script for CSPR.AI contracts on Casper Livenet
//!
//! Run with: cargo run --bin deploy_on_livenet --features=livenet
//!
//! Deploys all 4 contracts with public minting enabled

use odra::casper_types::U256;
use odra::host::Deployer;
use odra::prelude::Addressable;

use cspr_ai_contracts::token::{Cep18Token, Cep18TokenInitArgs};
use cspr_ai_contracts::nft::{NftCollection, NftCollectionInitArgs, MintingMode};
use cspr_ai_contracts::dao::{GovernanceDAO, GovernanceDAOInitArgs};
use cspr_ai_contracts::dex::{CsprAiDEX, CsprAiDEXInitArgs};

fn main() {
    // Get the livenet environment
    let env = odra_casper_livenet_env::env();

    println!("🚀 CSPR.AI Contract Deployment to Casper Testnet");
    println!("================================================\n");

    // Deploy Token
    // Gas: 500 billion motes (500 CSPR) - CEP-18 token
    println!("📦 1/4 Deploying Cep18Token...");
    env.set_gas(500_000_000_000u64);
    let token = Cep18Token::deploy(&env, Cep18TokenInitArgs {
        name: "CSPR.AI Token".to_string(),
        symbol: "CSPRAI".to_string(),
        decimals: 18,
        initial_supply: U256::from_dec_str("1000000000000000000000000").unwrap(), // 1M tokens
        _enable_minting: true,
    });
    println!("   ✅ Token deployed: {:?}\n", token.address());

    // Deploy NFT
    // Gas: 500 billion motes (500 CSPR) - NFT collection
    println!("📦 2/4 Deploying NftCollection...");
    env.set_gas(500_000_000_000u64);
    let nft = NftCollection::deploy(&env, NftCollectionInitArgs {
        name: "CSPR.AI NFT Collection".to_string(),
        symbol: "CSPRNFT".to_string(),
        base_uri: "https://api.cspr.ai/nft/".to_string(),
        max_supply: U256::from(10000u64),
        minting_mode: MintingMode::Public,
    });
    println!("   ✅ NFT deployed: {:?}\n", nft.address());

    // Deploy DAO
    // Gas: 500 billion motes (500 CSPR) - DAO includes CEP-18 token + voting logic
    println!("📦 3/4 Deploying GovernanceDAO...");
    env.set_gas(500_000_000_000u64);
    let dao = GovernanceDAO::deploy(&env, GovernanceDAOInitArgs {
        token_symbol: "CSPRGOV".to_string(),
        token_name: "CSPR.AI Governance".to_string(),
        initial_supply: U256::from_dec_str("1000000000000000000000000").unwrap(), // 1M tokens
        voting_period_ms: 604_800_000, // 7 days
        proposal_threshold: U256::from_dec_str("100000000000000000000").unwrap(), // 100 tokens
        quorum: U256::from_dec_str("1000000000000000000000").unwrap(), // 1000 tokens
    });
    println!("   ✅ DAO deployed: {:?}\n", dao.address());

    // Deploy DEX
    // Gas: 500 billion motes (500 CSPR) - DEX with AMM logic
    println!("📦 4/4 Deploying CsprAiDEX...");
    env.set_gas(500_000_000_000u64);
    let dex = CsprAiDEX::deploy(&env, CsprAiDEXInitArgs {
        default_fee_bps: 30, // 0.3% fee
    });
    println!("   ✅ DEX deployed: {:?}\n", dex.address());

    println!("📊 Deployment Complete");
    println!("======================\n");
    println!("Token: {:?}", token.address());
    println!("NFT:   {:?}", nft.address());
    println!("DAO:   {:?}", dao.address());
    println!("DEX:   {:?}", dex.address());
    println!("\n📝 Add these to your .env file:");
    println!("=====================================");
    println!("CASPER_TOKEN_CONTRACT_ADDRESS={:?}", token.address());
    println!("CASPER_NFT_CONTRACT_ADDRESS={:?}", nft.address());
    println!("CASPER_DAO_CONTRACT_ADDRESS={:?}", dao.address());
    println!("CASPER_DEX_CONTRACT_ADDRESS={:?}", dex.address());
}
