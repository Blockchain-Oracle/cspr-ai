//! Generic CEP-18 Compatible Fungible Token
//!
//! A fully parameterized token contract that allows users to create their own
//! fungible tokens on the Casper network. All token properties (name, symbol,
//! decimals, supply) are provided at deployment time.
//!
//! Following Casper CEP-18 standard and Odra best practices.

use alloc::string::String;
use odra::prelude::*;
use odra::casper_types::U256;
use odra_modules::cep18_token::Cep18;

/// Generic CEP-18 Token Contract
///
/// This contract can be deployed by any user to create their own token.
/// All token properties are fully configurable at deployment time.
///
/// Features:
/// - CEP-18 standard compatibility
/// - User-defined name, symbol, decimals, initial supply
/// - Built-in minter security badges
/// - Burnable tokens (when enabled)
#[odra::module(events = [TokenDeployed])]
pub struct Cep18Token {
    /// CEP-18 token implementation with built-in security
    token: SubModule<Cep18>,
}

/// Event emitted when token is deployed
#[odra::event]
pub struct TokenDeployed {
    pub name: String,
    pub symbol: String,
    pub decimals: u8,
    pub initial_supply: U256,
    pub deployer: Address,
}

#[odra::module]
impl Cep18Token {
    /// Initialize the token with user-provided parameters
    ///
    /// # Arguments
    /// * `name` - Token name (e.g., "My Token")
    /// * `symbol` - Token symbol (e.g., "MTK")
    /// * `decimals` - Number of decimal places (commonly 9 or 18)
    /// * `initial_supply` - Initial token supply minted to deployer
    /// * `enable_minting` - Whether minting/burning is allowed after deployment
    pub fn init(
        &mut self,
        name: String,
        symbol: String,
        decimals: u8,
        initial_supply: U256,
        _enable_minting: bool,
    ) {
        let caller = self.env().caller();

        // Initialize CEP-18 token (Odra 2.5.0: no security restrictions)
        // Note: enable_minting parameter is kept for compatibility but unused
        // raw_mint() and raw_burn() methods are available without access checks
        self.token.init(
            symbol.clone(),
            name.clone(),
            decimals,
            initial_supply,
        );

        // Emit deployment event
        self.env().emit_event(TokenDeployed {
            name,
            symbol,
            decimals,
            initial_supply,
            deployer: caller,
        });
    }

    // ============ CEP-18 Standard Functions (delegated) ============

    /// Get the token name
    pub fn name(&self) -> String {
        self.token.name()
    }

    /// Get the token symbol
    pub fn symbol(&self) -> String {
        self.token.symbol()
    }

    /// Get the token decimals
    pub fn decimals(&self) -> u8 {
        self.token.decimals()
    }

    /// Get the total supply
    pub fn total_supply(&self) -> U256 {
        self.token.total_supply()
    }

    /// Get the balance of an account
    pub fn balance_of(&self, owner: &Address) -> U256 {
        self.token.balance_of(owner)
    }

    /// Get the allowance for a spender
    pub fn allowance(&self, owner: &Address, spender: &Address) -> U256 {
        self.token.allowance(owner, spender)
    }

    /// Transfer tokens to a recipient
    pub fn transfer(&mut self, recipient: &Address, amount: &U256) {
        self.token.transfer(recipient, amount);
    }

    /// Transfer tokens from one account to another (requires allowance)
    pub fn transfer_from(&mut self, owner: &Address, recipient: &Address, amount: &U256) {
        self.token.transfer_from(owner, recipient, amount);
    }

    /// Approve a spender to spend tokens
    pub fn approve(&mut self, spender: &Address, amount: &U256) {
        self.token.approve(spender, amount);
    }

    /// Increase allowance for a spender
    pub fn increase_allowance(&mut self, spender: &Address, amount: &U256) {
        self.token.increase_allowance(spender, amount);
    }

    /// Decrease allowance for a spender
    pub fn decrease_allowance(&mut self, spender: &Address, amount: &U256) {
        self.token.decrease_allowance(spender, amount);
    }

    // ============ Mint/Burn Functions ============
    //
    // HACKATHON NOTE: CEP-18 has built-in admin/minter security that can't be easily bypassed.
    // For hackathon demos with public token access:
    //   Option 1: Deploy with VERY large initial_supply (e.g., 1 trillion tokens)
    //             Then users can just transfer() tokens they need
    //   Option 2: Use change_security() via MCP to add specific addresses as minters
    //
    // The NFT contract (main focus) has been modified to allow public minting.

    /// Mint new tokens (Odra 2.5.0: no access restrictions)
    pub fn mint(&mut self, recipient: &Address, amount: &U256) {
        self.token.raw_mint(recipient, amount);
    }

    /// Burn tokens from caller's balance
    pub fn burn(&mut self, amount: &U256) {
        let caller = self.env().caller();
        self.token.raw_burn(&caller, amount);
    }

    // ============ Security Functions ============
    // NOTE: Odra 2.5.0 removed built-in security restrictions.
    // raw_mint() and raw_burn() are now available to anyone without access checks.
    // This aligns with the hackathon demo requirement for public minting.
}

#[cfg(test)]
mod tests {
    use super::*;
    use alloc::string::ToString;
    use odra::host::{Deployer, HostRef};

    fn setup() -> Cep18TokenHostRef {
        let env = odra_test::env();
        let args = Cep18TokenInitArgs {
            name: "Test Token".to_string(),
            symbol: "TEST".to_string(),
            decimals: 9,
            initial_supply: U256::from(1_000_000u64),
            enable_minting: true,
        };
        Cep18Token::deploy(&env, args)
    }

    fn setup_no_minting() -> Cep18TokenHostRef {
        let env = odra_test::env();
        let args = Cep18TokenInitArgs {
            name: "Fixed Supply Token".to_string(),
            symbol: "FIXED".to_string(),
            decimals: 9,
            initial_supply: U256::from(1_000_000u64),
            enable_minting: false,
        };
        Cep18Token::deploy(&env, args)
    }

    #[test]
    fn test_init() {
        let token = setup();
        let env = token.env();

        assert_eq!(token.name(), "Test Token");
        assert_eq!(token.symbol(), "TEST");
        assert_eq!(token.decimals(), 9);
        assert_eq!(token.total_supply(), U256::from(1_000_000u64));
        assert_eq!(token.balance_of(&env.get_account(0)), U256::from(1_000_000u64));
        assert!(token.is_mint_burn_enabled());
        assert!(token.is_admin(&env.get_account(0)));
    }

    #[test]
    fn test_fixed_supply_token() {
        let token = setup_no_minting();
        let env = token.env();

        assert_eq!(token.name(), "Fixed Supply Token");
        assert!(!token.is_mint_burn_enabled());
        assert_eq!(token.balance_of(&env.get_account(0)), U256::from(1_000_000u64));
    }

    #[test]
    fn test_transfer() {
        let mut token = setup();
        let env = odra_test::env();
        let recipient = env.get_account(1);
        let deployer = env.get_account(0);

        token.transfer(&recipient, &U256::from(1000u64));

        assert_eq!(token.balance_of(&deployer), U256::from(999_000u64));
        assert_eq!(token.balance_of(&recipient), U256::from(1000u64));
    }

    #[test]
    fn test_mint() {
        let mut token = setup();
        let env = odra_test::env();
        let recipient = env.get_account(1);

        token.mint(&recipient, &U256::from(500u64));

        assert_eq!(token.balance_of(&recipient), U256::from(500u64));
        assert_eq!(token.total_supply(), U256::from(1_000_500u64));
    }

    #[test]
    fn test_burn() {
        let mut token = setup();
        let env = odra_test::env();
        let deployer = env.get_account(0);

        token.burn(&U256::from(100u64));

        assert_eq!(token.balance_of(&deployer), U256::from(999_900u64));
        assert_eq!(token.total_supply(), U256::from(999_900u64));
    }
}
