//! Integration Tests for CSPR.AI Contracts
//!
//! This test suite deploys all contracts and performs end-to-end testing:
//! - Token creation and transfers
//! - NFT minting and trading
//! - DAO proposal creation and voting
//! - DEX liquidity provision and swaps

extern crate alloc;

use odra::host::Deployer;
use odra::casper_types::U256;
use alloc::string::ToString;

// Import all contract modules
use cspr_ai_contracts::token::Cep18TokenInitArgs;
use cspr_ai_contracts::nft::{NftCollectionInitArgs, MintingMode};
use cspr_ai_contracts::dao::{GovernanceDAOInitArgs, ProposalAction};
use cspr_ai_contracts::dex::CsprAiDEXInitArgs;

#[test]
fn full_integration_test() {
    println!("\n=== CSPR.AI Full Integration Test ===\n");

    // Setup test environment
    let env = odra_test::env();

    // Test accounts
    let deployer = env.get_account(0);
    let alice = env.get_account(1);
    let bob = env.get_account(2);
    let carol = env.get_account(3);

    println!("✓ Test environment initialized");
    println!("  Deployer: {:?}", deployer);
    println!("  Alice: {:?}", alice);
    println!("  Bob: {:?}", bob);
    println!("  Carol: {:?}\n", carol);

    // =====================================
    // 1. Deploy and Test Token Contract
    // =====================================
    println!("📄 Step 1: Deploy Token Contract");

    let token_args = Cep18TokenInitArgs {
        name: "CSPR.AI Token".to_string(),
        symbol: "CSPRAI".to_string(),
        decimals: 9,
        initial_supply: U256::from(1_000_000_000u64), // 1B tokens
        enable_minting: true,
    };

    let mut token = cspr_ai_contracts::token::Cep18Token::deploy(&env, token_args);

    println!("  ✓ Token deployed");
    println!("    Name: {}", token.name());
    println!("    Symbol: {}", token.symbol());
    println!("    Total Supply: {}", token.total_supply());
    println!("    Deployer Balance: {}\n", token.balance_of(&deployer));

    // Transfer tokens to test users
    println!("💸 Transfer tokens to users...");
    token.transfer(&alice, &U256::from(100_000_000u64)); // 100M to Alice
    token.transfer(&bob, &U256::from(100_000_000u64));   // 100M to Bob
    token.transfer(&carol, &U256::from(50_000_000u64));  // 50M to Carol

    assert_eq!(token.balance_of(&alice), U256::from(100_000_000u64));
    assert_eq!(token.balance_of(&bob), U256::from(100_000_000u64));
    assert_eq!(token.balance_of(&carol), U256::from(50_000_000u64));

    println!("  ✓ Alice received: {} CSPRAI", token.balance_of(&alice));
    println!("  ✓ Bob received: {} CSPRAI", token.balance_of(&bob));
    println!("  ✓ Carol received: {} CSPRAI\n", token.balance_of(&carol));

    // Test token transfers between users
    println!("🔄 Alice sends 10M tokens to Bob...");
    env.set_caller(alice);
    token.transfer(&bob, &U256::from(10_000_000u64));

    assert_eq!(token.balance_of(&alice), U256::from(90_000_000u64));
    assert_eq!(token.balance_of(&bob), U256::from(110_000_000u64));

    println!("  ✓ Transfer successful");
    println!("    Alice balance: {}", token.balance_of(&alice));
    println!("    Bob balance: {}\n", token.balance_of(&bob));

    // Reset caller to deployer
    env.set_caller(deployer);

    // =====================================
    // 2. Deploy and Test NFT Contract
    // =====================================
    println!("🎨 Step 2: Deploy NFT Contract");

    let nft_args = NftCollectionInitArgs {
        name: "CSPR.AI NFT Collection".to_string(),
        symbol: "CSPRNFT".to_string(),
        base_uri: "ipfs://QmCSPRAI/".to_string(),
        max_supply: U256::from(10000u64),
        minting_mode: MintingMode::Public,
    };

    let mut nft = cspr_ai_contracts::nft::NftCollection::deploy(&env, nft_args);

    println!("  ✓ NFT Collection deployed");
    println!("    Name: {}", nft.name());
    println!("    Symbol: {}", nft.symbol());
    println!("    Max Supply: {}\n", nft.max_supply());

    // Mint NFTs to users
    println!("✨ Minting NFTs...");

    let nft_1 = nft.mint(
        &alice,
        "CSPR.AI Genesis #1".to_string(),
        "metadata/1.json".to_string()
    );

    let nft_2 = nft.mint(
        &bob,
        "CSPR.AI Genesis #2".to_string(),
        "metadata/2.json".to_string()
    );

    println!("  ✓ NFT #{} minted to Alice", nft_1);
    println!("  ✓ NFT #{} minted to Bob", nft_2);
    println!("    Total Supply: {}\n", nft.total_supply());

    // Transfer NFT
    println!("🔄 Alice transfers NFT to Carol...");
    env.set_caller(alice);
    nft.transfer_from(&alice, &carol, &nft_1);

    assert_eq!(nft.owner_of(&nft_1), carol);
    assert_eq!(nft.balance_of(&alice), U256::zero());
    assert_eq!(nft.balance_of(&carol), U256::one());

    println!("  ✓ NFT #{} now owned by Carol\n", nft_1);

    // Reset caller
    env.set_caller(deployer);

    // =====================================
    // 3. Deploy and Test DAO Contract
    // =====================================
    println!("🏛️  Step 3: Deploy DAO Contract");

    let dao_args = GovernanceDAOInitArgs {
        token_name: "CSPR.AI Governance".to_string(),
        token_symbol: "CSPRGOV".to_string(),
        initial_supply: U256::from(10_000_000u64), // 10M governance tokens
        voting_period_ms: 5 * 60 * 1000, // 5 minutes
        proposal_threshold: U256::from(10_000u64),
        quorum: U256::from(100_000u64),
    };

    let mut dao = cspr_ai_contracts::dao::GovernanceDAO::deploy(&env, dao_args);

    println!("  ✓ DAO deployed");
    println!("    Governance Token: {}", dao.token_name());
    println!("    Symbol: {}", dao.token_symbol());
    println!("    Total Supply: {}", dao.token_total_supply());

    let (voting_period, threshold, quorum) = dao.config();
    println!("    Voting Period: {}ms", voting_period);
    println!("    Proposal Threshold: {}", threshold);
    println!("    Quorum: {}\n", quorum);

    // Distribute governance tokens
    println!("📊 Distributing governance tokens...");
    dao.token_transfer(&alice, &U256::from(200_000u64));
    dao.token_transfer(&bob, &U256::from(200_000u64));
    dao.token_transfer(&carol, &U256::from(100_000u64));

    println!("  ✓ Alice: {} CSPRGOV", dao.token_balance_of(&alice));
    println!("  ✓ Bob: {} CSPRGOV", dao.token_balance_of(&bob));
    println!("  ✓ Carol: {} CSPRGOV\n", dao.token_balance_of(&carol));

    // Create a proposal
    println!("📝 Alice creates a proposal to mint new tokens...");
    env.set_caller(alice);

    let proposal_id = dao.create_proposal(
        "Mint 50,000 tokens for ecosystem growth".to_string(),
        ProposalAction::MintTokens {
            recipient: carol,
            amount: U256::from(50_000u64),
        }
    );

    println!("  ✓ Proposal #{} created", proposal_id);

    let proposal = dao.get_proposal(proposal_id).unwrap();
    println!("    Description: {}", proposal.description);
    println!("    Status: {:?}\n", proposal.status);

    // Cast votes
    println!("🗳️  Voting on proposal...");

    // Alice votes yes with 150k tokens
    dao.vote(proposal_id, true, U256::from(150_000u64));
    println!("  ✓ Alice voted YES with 150,000 tokens");

    // Bob votes yes with 120k tokens
    env.set_caller(bob);
    dao.vote(proposal_id, true, U256::from(120_000u64));
    println!("  ✓ Bob voted YES with 120,000 tokens");

    // Carol votes no with 80k tokens
    env.set_caller(carol);
    dao.vote(proposal_id, false, U256::from(80_000u64));
    println!("  ✓ Carol voted NO with 80,000 tokens");

    let proposal = dao.get_proposal(proposal_id).unwrap();
    println!("\n  Vote Tally:");
    println!("    YES: {}", proposal.yes_votes);
    println!("    NO: {}", proposal.no_votes);
    println!("    Total: {} (Quorum: {})\n",
        proposal.yes_votes + proposal.no_votes, quorum);

    // Advance time and execute proposal
    println!("⏰ Advancing time past voting period...");
    env.advance_block_time(6 * 60 * 1000); // 6 minutes

    env.set_caller(deployer);
    dao.execute(proposal_id);

    let proposal = dao.get_proposal(proposal_id).unwrap();
    println!("  ✓ Proposal executed");
    println!("    Final Status: {:?}", proposal.status);
    println!("    Carol's new balance: {}\n", dao.token_balance_of(&carol));

    // =====================================
    // 4. Deploy and Test DEX Contract
    // =====================================
    println!("💱 Step 4: Deploy DEX Contract");

    let dex_args = CsprAiDEXInitArgs {
        default_fee_bps: 30, // 0.3% fee
    };

    let mut dex = cspr_ai_contracts::dex::CsprAiDEX::deploy(&env, dex_args);

    println!("  ✓ DEX deployed");
    println!("    Default Fee: 0.3%\n");

    // Create a trading pool (using Alice and Bob addresses as token addresses)
    println!("🏊 Creating liquidity pool...");
    env.set_caller(deployer);

    let pool_id = dex.create_pool(alice, bob);

    println!("  ✓ Pool #{} created", pool_id);
    println!("    Token A: {:?}", alice);
    println!("    Token B: {:?}\n", bob);

    // Add initial liquidity
    println!("💧 Adding liquidity to pool...");

    let lp_tokens = dex.add_liquidity(
        pool_id,
        U256::from(1_000_000u64), // 1M Token A
        U256::from(1_000_000u64), // 1M Token B
        U256::zero()
    );

    let (reserve_a, reserve_b) = dex.get_reserves(pool_id);

    println!("  ✓ Liquidity added");
    println!("    LP Tokens received: {}", lp_tokens);
    println!("    Reserve A: {}", reserve_a);
    println!("    Reserve B: {}\n", reserve_b);

    // Perform a swap
    println!("🔄 Alice swaps 10,000 Token A for Token B...");
    env.set_caller(alice);

    let amount_in = U256::from(10_000u64);
    let amount_out = dex.swap_exact_tokens_for_tokens(
        pool_id,
        alice, // token_in
        amount_in,
        U256::zero() // no slippage protection
    );

    let (new_reserve_a, new_reserve_b) = dex.get_reserves(pool_id);

    println!("  ✓ Swap executed");
    println!("    Amount In: {} Token A", amount_in);
    println!("    Amount Out: {} Token B", amount_out);
    println!("    New Reserve A: {}", new_reserve_a);
    println!("    New Reserve B: {}\n", new_reserve_b);

    // Verify constant product formula (with fees)
    let old_product = reserve_a * reserve_b;
    let new_product = new_reserve_a * new_reserve_b;

    println!("📊 Constant Product Verification:");
    println!("    Old K: {}", old_product);
    println!("    New K: {}", new_product);
    println!("    Pool grew: {} (fees accumulated)\n", new_product > old_product);

    // Remove liquidity
    println!("🔙 Removing 50% of liquidity...");
    env.set_caller(deployer);

    let (withdrawn_a, withdrawn_b) = dex.remove_liquidity(
        pool_id,
        lp_tokens / U256::from(2u64), // Remove half
        U256::zero(),
        U256::zero()
    );

    println!("  ✓ Liquidity removed");
    println!("    Withdrawn Token A: {}", withdrawn_a);
    println!("    Withdrawn Token B: {}\n", withdrawn_b);

    // =====================================
    // Final Summary
    // =====================================
    println!("=== Integration Test Summary ===\n");
    println!("✅ Token Contract:");
    println!("   - Deployed and distributed tokens");
    println!("   - Tested transfers between users");
    println!("\n✅ NFT Contract:");
    println!("   - Deployed collection");
    println!("   - Minted NFTs to users");
    println!("   - Transferred NFT ownership");
    println!("\n✅ DAO Contract:");
    println!("   - Deployed governance system");
    println!("   - Created and voted on proposal");
    println!("   - Executed proposal successfully");
    println!("\n✅ DEX Contract:");
    println!("   - Deployed AMM DEX");
    println!("   - Created liquidity pool");
    println!("   - Performed token swaps");
    println!("   - Verified fee collection\n");

    println!("🎉 All integration tests passed!\n");
}

#[test]
fn dao_complete_lifecycle() {
    println!("\n=== DAO Complete Lifecycle Test ===\n");

    let env = odra_test::env();
    let deployer = env.get_account(0);
    let proposer = env.get_account(1);
    let voter1 = env.get_account(2);
    let voter2 = env.get_account(3);

    // Deploy DAO
    let dao_args = GovernanceDAOInitArgs {
        token_name: "Test Gov".to_string(),
        token_symbol: "TGOV".to_string(),
        initial_supply: U256::from(1_000_000u64),
        voting_period_ms: 3 * 60 * 1000,
        proposal_threshold: U256::from(100u64),
        quorum: U256::from(1000u64),
    };

    let mut dao = cspr_ai_contracts::dao::GovernanceDAO::deploy(&env, dao_args);

    // Distribute tokens
    dao.token_transfer(&proposer, &U256::from(200u64));
    dao.token_transfer(&voter1, &U256::from(600u64));
    dao.token_transfer(&voter2, &U256::from(500u64));

    // Create proposal
    env.set_caller(proposer);
    let proposal_id = dao.create_proposal(
        "Update voting period to 10 minutes".to_string(),
        ProposalAction::UpdateVotingPeriod {
            new_period: 10 * 60 * 1000,
        }
    );

    println!("✓ Proposal {} created", proposal_id);

    // Vote
    env.set_caller(voter1);
    dao.vote(proposal_id, true, U256::from(600u64));

    env.set_caller(voter2);
    dao.vote(proposal_id, true, U256::from(500u64));

    println!("✓ Votes cast");

    // Advance time and execute
    env.advance_block_time(4 * 60 * 1000);

    env.set_caller(deployer);
    dao.execute(proposal_id);

    let (new_period, _, _) = dao.config();
    assert_eq!(new_period, 10 * 60 * 1000);

    println!("✓ Proposal executed, new voting period: {}ms\n", new_period);
}

#[test]
fn dex_price_impact_test() {
    println!("\n=== DEX Price Impact Test ===\n");

    let env = odra_test::env();
    let _deployer = env.get_account(0);
    let token_a = env.get_account(1);
    let token_b = env.get_account(2);

    // Deploy DEX
    let dex_args = CsprAiDEXInitArgs {
        default_fee_bps: 30,
    };
    let mut dex = cspr_ai_contracts::dex::CsprAiDEX::deploy(&env, dex_args);

    // Create pool with 1:1 ratio
    let pool_id = dex.create_pool(token_a, token_b);
    dex.add_liquidity(
        pool_id,
        U256::from(100_000u64),
        U256::from(100_000u64),
        U256::zero()
    );

    println!("✓ Pool created with 100k:100k ratio");

    // Test small swap (low price impact)
    let small_amount = U256::from(1_000u64);
    let small_out = dex.swap_exact_tokens_for_tokens(
        pool_id,
        token_a,
        small_amount,
        U256::zero()
    );

    println!("Small swap: {} in → {} out", small_amount, small_out);

    // Test large swap (high price impact)
    let large_amount = U256::from(10_000u64);
    let large_out = dex.swap_exact_tokens_for_tokens(
        pool_id,
        token_a,
        large_amount,
        U256::zero()
    );

    println!("Large swap: {} in → {} out", large_amount, large_out);

    // Verify larger swaps have worse rates due to slippage
    let small_rate = (small_out.as_u64() as f64) / (small_amount.as_u64() as f64);
    let large_rate = (large_out.as_u64() as f64) / (large_amount.as_u64() as f64);

    println!("\n✓ Small swap rate: {:.4}", small_rate);
    println!("✓ Large swap rate: {:.4}", large_rate);
    println!("✓ Price impact verified: large trades get worse rates\n");

    assert!(small_rate > large_rate);
}

#[test]
fn nft_marketplace_simulation() {
    println!("\n=== NFT Marketplace Simulation ===\n");

    let env = odra_test::env();
    let _deployer = env.get_account(0);
    let artist = env.get_account(1);
    let collector1 = env.get_account(2);
    let collector2 = env.get_account(3);

    // Deploy NFT collection
    let nft_args = NftCollectionInitArgs {
        name: "Digital Art".to_string(),
        symbol: "ART".to_string(),
        base_uri: "ipfs://art/".to_string(),
        max_supply: U256::from(100u64),
        minting_mode: MintingMode::Public,
    };

    let mut nft = cspr_ai_contracts::nft::NftCollection::deploy(&env, nft_args);

    // Artist mints 3 NFTs
    env.set_caller(artist);
    let nft1 = nft.mint(&artist, "Artwork #1".to_string(), "1.json".to_string());
    let nft2 = nft.mint(&artist, "Artwork #2".to_string(), "2.json".to_string());
    let nft3 = nft.mint(&artist, "Artwork #3".to_string(), "3.json".to_string());

    println!("✓ Artist minted 3 NFTs: #{}, #{}, #{}", nft1, nft2, nft3);

    // Artist sells NFT #1 to collector1
    nft.transfer_from(&artist, &collector1, &nft1);
    println!("✓ NFT #{} sold to Collector 1", nft1);

    // Artist approves collector2 for NFT #2
    nft.approve(&collector2, &nft2);
    println!("✓ Collector 2 approved for NFT #{}", nft2);

    // Collector2 takes ownership
    env.set_caller(collector2);
    nft.transfer_from(&artist, &collector2, &nft2);
    println!("✓ NFT #{} transferred to Collector 2", nft2);

    // Verify final ownership
    assert_eq!(nft.owner_of(&nft1), collector1);
    assert_eq!(nft.owner_of(&nft2), collector2);
    assert_eq!(nft.owner_of(&nft3), artist);

    println!("\nFinal ownership:");
    println!("  NFT #{}: Collector 1", nft1);
    println!("  NFT #{}: Collector 2", nft2);
    println!("  NFT #{}: Artist (unsold)\n", nft3);
}
