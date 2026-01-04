//! CSPR.AI DEX - Automated Market Maker
//!
//! A decentralized exchange using constant product formula (x * y = k).
//! Supports adding/removing liquidity and token swaps.

use odra::prelude::*;
use odra::casper_types::U256;
use odra_modules::access::Ownable;

/// Liquidity pool information
#[odra::odra_type]
pub struct Pool {
    pub token_a: Address,
    pub token_b: Address,
    pub reserve_a: U256,
    pub reserve_b: U256,
    pub total_lp_supply: U256,
    pub fee_bps: u32, // Fee in basis points (e.g., 30 = 0.3%) - u32 because Casper doesn't support u16
}

/// Events
#[odra::event]
pub struct LiquidityAdded {
    pub provider: Address,
    pub token_a_amount: U256,
    pub token_b_amount: U256,
    pub lp_tokens_minted: U256,
}

#[odra::event]
pub struct LiquidityRemoved {
    pub provider: Address,
    pub token_a_amount: U256,
    pub token_b_amount: U256,
    pub lp_tokens_burned: U256,
}

#[odra::event]
pub struct Swap {
    pub trader: Address,
    pub token_in: Address,
    pub token_out: Address,
    pub amount_in: U256,
    pub amount_out: U256,
}

#[odra::event]
pub struct PoolCreated {
    pub pool_id: u64,
    pub token_a: Address,
    pub token_b: Address,
}

/// DEX Errors
#[odra::odra_error]
pub enum DEXError {
    /// Pool does not exist
    PoolNotFound = 1,
    /// Pool already exists
    PoolAlreadyExists = 2,
    /// Insufficient liquidity in pool
    InsufficientLiquidity = 3,
    /// Slippage tolerance exceeded
    SlippageExceeded = 4,
    /// Invalid token pair
    InvalidTokenPair = 5,
    /// Insufficient LP tokens
    InsufficientLPTokens = 6,
    /// Zero amount not allowed
    ZeroAmount = 7,
    /// Invalid fee
    InvalidFee = 8,
}

/// CSPR.AI DEX Contract
#[odra::module(events = [LiquidityAdded, LiquidityRemoved, Swap, PoolCreated])]
pub struct CsprAiDEX {
    /// Contract owner
    owner: SubModule<Ownable>,

    /// Pool storage: pool_id -> Pool
    pools: Mapping<u64, Pool>,
    /// Pool lookup: (token_a, token_b) -> pool_id (sorted addresses)
    pool_ids: Mapping<(Address, Address), u64>,
    /// Pool count
    pool_count: Var<u64>,

    /// LP balances: (pool_id, provider) -> lp_amount
    lp_balances: Mapping<(u64, Address), U256>,

    /// Default fee in basis points (u32 because Casper doesn't support u16)
    default_fee_bps: Var<u32>,
}

#[odra::module]
impl CsprAiDEX {
    /// Initialize the DEX
    pub fn init(&mut self, default_fee_bps: u32) {
        // Initialize ownership (Odra 2.5.0: requires caller address)
        let caller = self.env().caller();
        self.owner.init(caller);
        self.pool_count.set(0);

        if default_fee_bps > 1000 {
            // Max 10%
            self.env().revert(DEXError::InvalidFee);
        }
        self.default_fee_bps.set(default_fee_bps);
    }

    // ============ Pool Management ============

    /// Create a new liquidity pool
    pub fn create_pool(&mut self, token_a: Address, token_b: Address) -> u64 {
        if token_a == token_b {
            self.env().revert(DEXError::InvalidTokenPair);
        }

        // Sort addresses for consistent ordering
        let (sorted_a, sorted_b) = self.sort_tokens(&token_a, &token_b);

        // Check if pool exists
        if self.pool_ids.get(&(sorted_a, sorted_b)).is_some() {
            self.env().revert(DEXError::PoolAlreadyExists);
        }

        let pool_id = self.pool_count.get_or_default() + 1;

        let pool = Pool {
            token_a: sorted_a,
            token_b: sorted_b,
            reserve_a: U256::zero(),
            reserve_b: U256::zero(),
            total_lp_supply: U256::zero(),
            fee_bps: self.default_fee_bps.get_or_default(),
        };

        self.pools.set(&pool_id, pool);
        self.pool_ids.set(&(sorted_a, sorted_b), pool_id);
        self.pool_count.set(pool_id);

        self.env().emit_event(PoolCreated {
            pool_id,
            token_a: sorted_a,
            token_b: sorted_b,
        });

        pool_id
    }

    /// Add liquidity to a pool
    pub fn add_liquidity(
        &mut self,
        pool_id: u64,
        amount_a: U256,
        amount_b: U256,
        min_lp_tokens: U256,
    ) -> U256 {
        let caller = self.env().caller();

        if amount_a == U256::zero() || amount_b == U256::zero() {
            self.env().revert(DEXError::ZeroAmount);
        }

        let mut pool = self
            .pools
            .get(&pool_id)
            .unwrap_or_else(|| self.env().revert(DEXError::PoolNotFound));

        // Calculate LP tokens to mint
        let lp_tokens = if pool.total_lp_supply == U256::zero() {
            // First liquidity provider: LP tokens = sqrt(amount_a * amount_b)
            self.sqrt(amount_a * amount_b)
        } else {
            // Subsequent providers: proportional to existing liquidity
            let lp_from_a = (amount_a * pool.total_lp_supply) / pool.reserve_a;
            let lp_from_b = (amount_b * pool.total_lp_supply) / pool.reserve_b;
            // Use minimum to prevent manipulation
            if lp_from_a < lp_from_b {
                lp_from_a
            } else {
                lp_from_b
            }
        };

        if lp_tokens < min_lp_tokens {
            self.env().revert(DEXError::SlippageExceeded);
        }

        // Update pool reserves
        pool.reserve_a += amount_a;
        pool.reserve_b += amount_b;
        pool.total_lp_supply += lp_tokens;
        self.pools.set(&pool_id, pool);

        // Update LP balance
        let current_lp = self.lp_balances.get(&(pool_id, caller)).unwrap_or(U256::zero());
        self.lp_balances.set(&(pool_id, caller), current_lp + lp_tokens);

        self.env().emit_event(LiquidityAdded {
            provider: caller,
            token_a_amount: amount_a,
            token_b_amount: amount_b,
            lp_tokens_minted: lp_tokens,
        });

        lp_tokens
    }

    /// Remove liquidity from a pool
    pub fn remove_liquidity(
        &mut self,
        pool_id: u64,
        lp_tokens: U256,
        min_amount_a: U256,
        min_amount_b: U256,
    ) -> (U256, U256) {
        let caller = self.env().caller();

        if lp_tokens == U256::zero() {
            self.env().revert(DEXError::ZeroAmount);
        }

        let mut pool = self
            .pools
            .get(&pool_id)
            .unwrap_or_else(|| self.env().revert(DEXError::PoolNotFound));

        // Check LP balance
        let caller_lp = self.lp_balances.get(&(pool_id, caller)).unwrap_or(U256::zero());
        if caller_lp < lp_tokens {
            self.env().revert(DEXError::InsufficientLPTokens);
        }

        // Calculate token amounts to return
        let amount_a = (lp_tokens * pool.reserve_a) / pool.total_lp_supply;
        let amount_b = (lp_tokens * pool.reserve_b) / pool.total_lp_supply;

        if amount_a < min_amount_a || amount_b < min_amount_b {
            self.env().revert(DEXError::SlippageExceeded);
        }

        // Update pool reserves
        pool.reserve_a -= amount_a;
        pool.reserve_b -= amount_b;
        pool.total_lp_supply -= lp_tokens;
        self.pools.set(&pool_id, pool);

        // Update LP balance
        self.lp_balances.set(&(pool_id, caller), caller_lp - lp_tokens);

        self.env().emit_event(LiquidityRemoved {
            provider: caller,
            token_a_amount: amount_a,
            token_b_amount: amount_b,
            lp_tokens_burned: lp_tokens,
        });

        (amount_a, amount_b)
    }

    // ============ Swap Functions ============

    /// Swap exact tokens for tokens
    pub fn swap_exact_tokens_for_tokens(
        &mut self,
        pool_id: u64,
        token_in: Address,
        amount_in: U256,
        min_amount_out: U256,
    ) -> U256 {
        let caller = self.env().caller();

        if amount_in == U256::zero() {
            self.env().revert(DEXError::ZeroAmount);
        }

        let mut pool = self
            .pools
            .get(&pool_id)
            .unwrap_or_else(|| self.env().revert(DEXError::PoolNotFound));

        // Determine swap direction
        let (reserve_in, reserve_out, is_a_to_b) = if token_in == pool.token_a {
            (pool.reserve_a, pool.reserve_b, true)
        } else if token_in == pool.token_b {
            (pool.reserve_b, pool.reserve_a, false)
        } else {
            self.env().revert(DEXError::InvalidTokenPair)
        };

        // Calculate output using constant product formula with fee
        let amount_out = self.get_amount_out(amount_in, reserve_in, reserve_out, pool.fee_bps);

        if amount_out < min_amount_out {
            self.env().revert(DEXError::SlippageExceeded);
        }

        if amount_out > reserve_out {
            self.env().revert(DEXError::InsufficientLiquidity);
        }

        // Update reserves
        if is_a_to_b {
            pool.reserve_a += amount_in;
            pool.reserve_b -= amount_out;
        } else {
            pool.reserve_b += amount_in;
            pool.reserve_a -= amount_out;
        }
        self.pools.set(&pool_id, pool.clone());

        let token_out = if is_a_to_b { pool.token_b } else { pool.token_a };

        self.env().emit_event(Swap {
            trader: caller,
            token_in,
            token_out,
            amount_in,
            amount_out,
        });

        amount_out
    }

    /// Get quote for swap
    pub fn get_swap_quote(
        &self,
        pool_id: u64,
        token_in: Address,
        amount_in: U256,
    ) -> U256 {
        let pool = self
            .pools
            .get(&pool_id)
            .unwrap_or_else(|| self.env().revert(DEXError::PoolNotFound));

        let (reserve_in, reserve_out) = if token_in == pool.token_a {
            (pool.reserve_a, pool.reserve_b)
        } else if token_in == pool.token_b {
            (pool.reserve_b, pool.reserve_a)
        } else {
            self.env().revert(DEXError::InvalidTokenPair)
        };

        self.get_amount_out(amount_in, reserve_in, reserve_out, pool.fee_bps)
    }

    // ============ View Functions ============

    /// Get pool information
    pub fn get_pool(&self, pool_id: u64) -> Option<Pool> {
        self.pools.get(&pool_id)
    }

    /// Get pool ID by token pair
    pub fn get_pool_id(&self, token_a: &Address, token_b: &Address) -> Option<u64> {
        let (sorted_a, sorted_b) = self.sort_tokens(token_a, token_b);
        self.pool_ids.get(&(sorted_a, sorted_b))
    }

    /// Get pool count
    pub fn pool_count(&self) -> u64 {
        self.pool_count.get_or_default()
    }

    /// Get LP balance
    pub fn lp_balance(&self, pool_id: u64, provider: &Address) -> U256 {
        self.lp_balances.get(&(pool_id, *provider)).unwrap_or(U256::zero())
    }

    /// Get reserves
    pub fn get_reserves(&self, pool_id: u64) -> (U256, U256) {
        let pool = self
            .pools
            .get(&pool_id)
            .unwrap_or_else(|| self.env().revert(DEXError::PoolNotFound));
        (pool.reserve_a, pool.reserve_b)
    }

    // ============ Admin Functions ============

    /// Update pool fee
    pub fn set_pool_fee(&mut self, pool_id: u64, fee_bps: u32) {
        self.owner.assert_owner(&self.env().caller());

        if fee_bps > 1000 {
            self.env().revert(DEXError::InvalidFee);
        }

        let mut pool = self
            .pools
            .get(&pool_id)
            .unwrap_or_else(|| self.env().revert(DEXError::PoolNotFound));

        pool.fee_bps = fee_bps;
        self.pools.set(&pool_id, pool);
    }

    // ============ Internal Functions ============

    /// Sort token addresses for consistent ordering
    fn sort_tokens(&self, token_a: &Address, token_b: &Address) -> (Address, Address) {
        // Simple comparison - in production use proper address comparison
        if format!("{:?}", token_a) < format!("{:?}", token_b) {
            (*token_a, *token_b)
        } else {
            (*token_b, *token_a)
        }
    }

    /// Calculate output amount using constant product formula
    /// amount_out = (amount_in * fee_factor * reserve_out) / (reserve_in + amount_in * fee_factor)
    fn get_amount_out(&self, amount_in: U256, reserve_in: U256, reserve_out: U256, fee_bps: u32) -> U256 {
        let fee_factor = U256::from(10000u32 - fee_bps);
        let amount_in_with_fee = amount_in * fee_factor;
        let numerator = amount_in_with_fee * reserve_out;
        let denominator = (reserve_in * U256::from(10000u32)) + amount_in_with_fee;
        numerator / denominator
    }

    /// Integer square root (Babylonian method)
    fn sqrt(&self, n: U256) -> U256 {
        if n == U256::zero() {
            return U256::zero();
        }

        let mut x = n;
        let mut y = (x + U256::one()) / 2;

        while y < x {
            x = y;
            y = (x + n / x) / 2;
        }

        x
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use odra::host::{Deployer, HostRef};

    fn setup() -> CsprAiDEXHostRef {
        let env = odra_test::env();
        let args = CsprAiDEXInitArgs {
            default_fee_bps: 30, // 0.3% fee
        };
        CsprAiDEX::deploy(&env, args)
    }

    #[test]
    fn test_create_pool() {
        let mut dex = setup();
        let env = dex.env();

        let token_a = env.get_account(1);
        let token_b = env.get_account(2);

        let pool_id = dex.create_pool(token_a, token_b);

        assert_eq!(pool_id, 1);
        assert_eq!(dex.pool_count(), 1);

        let pool = dex.get_pool(1).unwrap();
        assert_eq!(pool.reserve_a, U256::zero());
        assert_eq!(pool.reserve_b, U256::zero());
        assert_eq!(pool.fee_bps, 30);
    }

    #[test]
    fn test_add_liquidity() {
        let mut dex = setup();
        let env = dex.env();

        let token_a = env.get_account(1);
        let token_b = env.get_account(2);

        let pool_id = dex.create_pool(token_a, token_b);

        // Add initial liquidity
        let lp_tokens = dex.add_liquidity(
            pool_id,
            U256::from(1000u64),
            U256::from(1000u64),
            U256::zero(), // min_lp_tokens
        );

        // LP tokens should be sqrt(1000 * 1000) = 1000
        assert_eq!(lp_tokens, U256::from(1000u64));

        // Check reserves updated
        let (reserve_a, reserve_b) = dex.get_reserves(pool_id);
        assert_eq!(reserve_a, U256::from(1000u64));
        assert_eq!(reserve_b, U256::from(1000u64));
    }

    #[test]
    fn test_swap_a_to_b() {
        let mut dex = setup();
        let env = dex.env();

        let token_a = env.get_account(1);
        let token_b = env.get_account(2);

        let pool_id = dex.create_pool(token_a, token_b);

        // Add liquidity: 1000 A, 1000 B
        dex.add_liquidity(
            pool_id,
            U256::from(1000u64),
            U256::from(1000u64),
            U256::zero(),
        );

        // Swap 100 A for B
        let amount_in = U256::from(100u64);
        let amount_out = dex.swap_exact_tokens_for_tokens(
            pool_id,
            token_a,
            amount_in,
            U256::zero(), // No slippage protection for this test
        );

        // With 0.3% fee (30 bps):
        // amount_in_with_fee = 100 * 9970 = 997000
        // numerator = 997000 * 1000 = 997000000
        // denominator = 1000 * 10000 + 997000 = 10997000
        // amount_out = 997000000 / 10997000 = 90 (integer division)
        assert!(amount_out > U256::zero());
        assert!(amount_out < U256::from(100u64)); // Less than input due to fee

        // Check reserves updated (constant product maintained)
        let (reserve_a, reserve_b) = dex.get_reserves(pool_id);
        assert_eq!(reserve_a, U256::from(1000u64) + amount_in);
        assert_eq!(reserve_b, U256::from(1000u64) - amount_out);
    }

    #[test]
    fn test_swap_b_to_a() {
        let mut dex = setup();
        let env = dex.env();

        let token_a = env.get_account(1);
        let token_b = env.get_account(2);

        let pool_id = dex.create_pool(token_a, token_b);

        // Add liquidity
        dex.add_liquidity(
            pool_id,
            U256::from(1000u64),
            U256::from(1000u64),
            U256::zero(),
        );

        // Swap 50 B for A
        let amount_in = U256::from(50u64);
        let amount_out = dex.swap_exact_tokens_for_tokens(
            pool_id,
            token_b,
            amount_in,
            U256::zero(),
        );

        // Should get A tokens out
        assert!(amount_out > U256::zero());

        // Check reserves updated
        let (reserve_a, reserve_b) = dex.get_reserves(pool_id);
        assert_eq!(reserve_b, U256::from(1000u64) + amount_in);
        assert_eq!(reserve_a, U256::from(1000u64) - amount_out);
    }

    #[test]
    #[should_panic(expected = "SlippageExceeded")]
    fn test_swap_slippage_protection() {
        let mut dex = setup();
        let env = dex.env();

        let token_a = env.get_account(1);
        let token_b = env.get_account(2);

        let pool_id = dex.create_pool(token_a, token_b);

        // Add liquidity
        dex.add_liquidity(
            pool_id,
            U256::from(1000u64),
            U256::from(1000u64),
            U256::zero(),
        );

        // Try to swap with impossible min_amount_out
        dex.swap_exact_tokens_for_tokens(
            pool_id,
            token_a,
            U256::from(100u64),
            U256::from(1000u64), // Expect more out than possible
        );
    }

    #[test]
    fn test_remove_liquidity() {
        let mut dex = setup();
        let env = dex.env();

        let token_a = env.get_account(1);
        let token_b = env.get_account(2);

        let pool_id = dex.create_pool(token_a, token_b);

        // Add liquidity
        let lp_tokens = dex.add_liquidity(
            pool_id,
            U256::from(1000u64),
            U256::from(1000u64),
            U256::zero(),
        );

        // Remove half the liquidity
        let (amount_a, amount_b) = dex.remove_liquidity(
            pool_id,
            lp_tokens / U256::from(2u64),
            U256::zero(), // min_amount_a
            U256::zero(), // min_amount_b
        );

        // Should get back approximately half of each token
        assert!(amount_a >= U256::from(499u64) && amount_a <= U256::from(500u64));
        assert!(amount_b >= U256::from(499u64) && amount_b <= U256::from(500u64));

        // Check reserves reduced
        let (reserve_a, reserve_b) = dex.get_reserves(pool_id);
        assert!(reserve_a >= U256::from(500u64) && reserve_a <= U256::from(501u64));
        assert!(reserve_b >= U256::from(500u64) && reserve_b <= U256::from(501u64));
    }

    #[test]
    fn test_remove_all_liquidity() {
        let mut dex = setup();
        let env = dex.env();

        let token_a = env.get_account(1);
        let token_b = env.get_account(2);

        let pool_id = dex.create_pool(token_a, token_b);

        // Add liquidity
        let lp_tokens = dex.add_liquidity(
            pool_id,
            U256::from(1000u64),
            U256::from(1000u64),
            U256::zero(),
        );

        // Remove all liquidity
        let (amount_a, amount_b) = dex.remove_liquidity(
            pool_id,
            lp_tokens,
            U256::zero(),
            U256::zero(),
        );

        // Should get back all tokens
        assert_eq!(amount_a, U256::from(1000u64));
        assert_eq!(amount_b, U256::from(1000u64));

        // Check reserves are zero
        let (reserve_a, reserve_b) = dex.get_reserves(pool_id);
        assert_eq!(reserve_a, U256::zero());
        assert_eq!(reserve_b, U256::zero());
    }

    #[test]
    #[should_panic(expected = "InsufficientLiquidity")]
    fn test_remove_liquidity_slippage_protection() {
        let mut dex = setup();
        let env = dex.env();

        let token_a = env.get_account(1);
        let token_b = env.get_account(2);

        let pool_id = dex.create_pool(token_a, token_b);

        // Add liquidity
        let lp_tokens = dex.add_liquidity(
            pool_id,
            U256::from(1000u64),
            U256::from(1000u64),
            U256::zero(),
        );

        // Try to remove with impossible min amounts
        dex.remove_liquidity(
            pool_id,
            lp_tokens / U256::from(2u64),
            U256::from(600u64), // Expect more than half (impossible)
            U256::from(600u64),
        );
    }

    #[test]
    fn test_add_liquidity_proportional() {
        let mut dex = setup();
        let env = dex.env();

        let token_a = env.get_account(1);
        let token_b = env.get_account(2);

        let pool_id = dex.create_pool(token_a, token_b);

        // Add initial liquidity
        dex.add_liquidity(
            pool_id,
            U256::from(1000u64),
            U256::from(2000u64), // 1:2 ratio
            U256::zero(),
        );

        // Add more liquidity maintaining ratio
        let lp_tokens = dex.add_liquidity(
            pool_id,
            U256::from(500u64),  // 1:2 ratio maintained
            U256::from(1000u64),
            U256::zero(),
        );

        // Should get LP tokens proportional to contribution
        assert!(lp_tokens > U256::zero());

        // Check reserves updated proportionally
        let (reserve_a, reserve_b) = dex.get_reserves(pool_id);
        assert_eq!(reserve_a, U256::from(1500u64));
        assert_eq!(reserve_b, U256::from(3000u64));
    }

    #[test]
    fn test_fee_collection() {
        let mut dex = setup();
        let env = dex.env();

        let token_a = env.get_account(1);
        let token_b = env.get_account(2);

        let pool_id = dex.create_pool(token_a, token_b);

        // Add liquidity
        dex.add_liquidity(
            pool_id,
            U256::from(10000u64),
            U256::from(10000u64),
            U256::zero(),
        );

        // Perform swap (fee = 0.3%)
        let initial_reserve_a = U256::from(10000u64);
        let amount_in = U256::from(1000u64);

        let amount_out = dex.swap_exact_tokens_for_tokens(
            pool_id,
            token_a,
            amount_in,
            U256::zero(),
        );

        // Check that reserves reflect fee retention
        let (reserve_a, reserve_b) = dex.get_reserves(pool_id);

        // reserve_a increases by full amount_in
        assert_eq!(reserve_a, initial_reserve_a + amount_in);

        // reserve_b decreases by amount_out (which is less due to fee)
        assert_eq!(reserve_b, U256::from(10000u64) - amount_out);

        // Verify constant product increased (fee retention)
        let new_product = reserve_a * reserve_b;
        let old_product = U256::from(10000u64) * U256::from(10000u64);
        assert!(new_product > old_product); // Pool grew due to fees
    }

    #[test]
    #[should_panic(expected = "InvalidToken")]
    fn test_swap_invalid_token() {
        let mut dex = setup();
        let env = dex.env();

        let token_a = env.get_account(1);
        let token_b = env.get_account(2);
        let token_c = env.get_account(3);

        let pool_id = dex.create_pool(token_a, token_b);

        dex.add_liquidity(
            pool_id,
            U256::from(1000u64),
            U256::from(1000u64),
            U256::zero(),
        );

        // Try to swap with token not in pool
        dex.swap_exact_tokens_for_tokens(
            pool_id,
            token_c,
            U256::from(100u64),
            U256::zero(),
        );
    }

    #[test]
    #[should_panic(expected = "InsufficientAmount")]
    fn test_swap_zero_amount() {
        let mut dex = setup();
        let env = dex.env();

        let token_a = env.get_account(1);
        let token_b = env.get_account(2);

        let pool_id = dex.create_pool(token_a, token_b);

        dex.add_liquidity(
            pool_id,
            U256::from(1000u64),
            U256::from(1000u64),
            U256::zero(),
        );

        // Try to swap zero amount
        dex.swap_exact_tokens_for_tokens(
            pool_id,
            token_a,
            U256::zero(),
            U256::zero(),
        );
    }
}
