//! Generic NFT Collection Contract
//!
//! A fully parameterized NFT collection that allows users to create their own
//! NFT collections on the Casper network with PUBLIC MINTING support.
//!
//! Uses Odra's built-in ERC-721 modules with custom public minting logic.

use alloc::string::String;
use odra::prelude::*;
use odra::casper_types::U256;
use odra_modules::erc721::erc721_base::Erc721Base;
use odra_modules::erc721::extensions::erc721_metadata::{Erc721MetadataExtension, Erc721Metadata};
use odra_modules::erc721::Erc721;
use odra_modules::access::Ownable;

/// Minting mode for the collection
#[odra::odra_type]
#[derive(Default)]
pub enum MintingMode {
    /// Only the contract owner can mint
    #[default]
    Restricted,
    /// Anyone can mint (public minting)
    Public,
}

/// NFT Minted event
#[odra::event]
pub struct NFTMinted {
    pub to: Address,
    pub token_id: U256,
    pub name: String,
}

/// Transfer event (re-exported from ERC-721)
#[odra::event]
pub struct Transfer {
    pub from: Option<Address>,
    pub to: Option<Address>,
    pub token_id: U256,
}

/// NFT Collection deployed event
#[odra::event]
pub struct NFTCollectionDeployed {
    pub name: String,
    pub symbol: String,
    pub base_uri: String,
    pub max_supply: U256,
    pub minting_mode: MintingMode,
}

/// NFT Errors
#[odra::odra_error]
pub enum NFTError {
    /// Max supply reached
    MaxSupplyReached = 1,
    /// Not authorized to mint
    NotAuthorizedToMint = 2,
    /// Token already exists
    TokenAlreadyExists = 3,
}

/// Generic NFT Collection Contract
///
/// Uses Odra's ERC-721 modules with custom public minting logic:
/// - Erc721Base for core NFT functionality
/// - Erc721MetadataExtension for name/symbol/URI
/// - Ownable for ownership management
#[odra::module(events = [NFTMinted, NFTCollectionDeployed, Transfer], errors = NFTError)]
pub struct NftCollection {
    /// ERC-721 core functionality
    core: SubModule<Erc721Base>,
    /// ERC-721 metadata (name, symbol, base_uri)
    metadata: SubModule<Erc721MetadataExtension>,
    /// Ownership management
    ownable: SubModule<Ownable>,
    /// Maximum supply (0 = unlimited)
    max_supply: Var<U256>,
    /// Next token ID to mint
    next_token_id: Var<U256>,
    /// Minting mode (Public or Restricted)
    minting_mode: Var<MintingMode>,
}

#[odra::module]
impl NftCollection {
    /// Initialize the NFT collection
    ///
    /// # Arguments
    /// * `name` - Collection name (e.g., "My NFT Collection")
    /// * `symbol` - Collection symbol (e.g., "MNFT")
    /// * `base_uri` - Base URI for metadata (e.g., "https://api.example.com/nft/")
    /// * `max_supply` - Maximum number of tokens (0 = unlimited)
    /// * `minting_mode` - Public or Restricted minting
    pub fn init(
        &mut self,
        name: String,
        symbol: String,
        base_uri: String,
        max_supply: U256,
        minting_mode: MintingMode,
    ) {
        // Initialize metadata
        self.metadata.init(name.clone(), symbol.clone(), base_uri.clone());

        // Initialize ownership (caller becomes owner)
        let caller = self.env().caller();
        self.ownable.init(caller);

        // Set collection parameters
        self.max_supply.set(max_supply);
        self.next_token_id.set(U256::from(0));
        self.minting_mode.set(minting_mode.clone());

        // Emit deployment event
        self.env().emit_event(NFTCollectionDeployed {
            name,
            symbol,
            base_uri,
            max_supply,
            minting_mode,
        });
    }

    /// Mint a new NFT (PUBLIC or RESTRICTED based on minting_mode)
    ///
    /// # Arguments
    /// * `to` - Recipient address
    /// * `_name` - Token name (for frontend display, not stored on-chain)
    /// * `token_uri` - Custom token URI (not used in this implementation, uses base_uri + token_id)
    ///
    /// # Returns
    /// The token ID of the newly minted NFT
    pub fn mint(&mut self, to: &Address, _name: String, token_uri: String) -> U256 {
        // Check minting authorization
        let minting_mode = self.minting_mode.get_or_default();
        if minting_mode == MintingMode::Restricted {
            // Restricted mode: only owner can mint
            self.ownable.assert_owner(&self.env().caller());
        }
        // Public mode: anyone can mint (no check needed)

        // Check max supply
        let max_supply = self.max_supply.get_or_default();
        if max_supply > U256::from(0) {
            let next_id = self.next_token_id.get_or_default();
            if next_id >= max_supply {
                self.env().revert(NFTError::MaxSupplyReached);
            }
        }

        // Get and increment token ID
        let token_id = self.next_token_id.get_or_default();
        self.next_token_id.set(token_id + U256::from(1));

        // Check token doesn't already exist
        if self.core.exists(&token_id) {
            self.env().revert(NFTError::TokenAlreadyExists);
        }

        // Mint the token (directly update storage)
        self.core.balances.add(to, U256::from(1));
        self.core.owners.set(&token_id, Some(*to));

        // Emit Transfer event (from zero address = mint)
        self.env().emit_event(Transfer {
            from: None,
            to: Some(*to),
            token_id,
        });

        // Emit custom mint event
        self.env().emit_event(NFTMinted {
            to: *to,
            token_id,
            name: _name,
        });

        token_id
    }

    // ===== Delegated ERC-721 Core Methods =====

    pub fn balance_of(&self, owner: &Address) -> U256 {
        self.core.balance_of(owner)
    }

    pub fn owner_of(&self, token_id: &U256) -> Address {
        self.core.owner_of(token_id)
    }

    pub fn transfer_from(&mut self, from: &Address, to: &Address, token_id: &U256) {
        self.core.transfer_from(from, to, token_id);
    }

    pub fn safe_transfer_from(&mut self, from: &Address, to: &Address, token_id: &U256) {
        self.core.safe_transfer_from(from, to, token_id);
    }

    pub fn approve(&mut self, approved: &Option<Address>, token_id: &U256) {
        self.core.approve(approved, token_id);
    }

    pub fn set_approval_for_all(&mut self, operator: &Address, approved: bool) {
        self.core.set_approval_for_all(operator, approved);
    }

    pub fn get_approved(&self, token_id: &U256) -> Option<Address> {
        self.core.get_approved(token_id)
    }

    pub fn is_approved_for_all(&self, owner: &Address, operator: &Address) -> bool {
        self.core.is_approved_for_all(owner, operator)
    }

    // ===== Delegated Metadata Methods =====

    pub fn name(&self) -> String {
        self.metadata.name()
    }

    pub fn symbol(&self) -> String {
        self.metadata.symbol()
    }

    pub fn base_uri(&self) -> String {
        self.metadata.base_uri()
    }

    // ===== Ownership Methods =====

    pub fn owner(&self) -> Address {
        self.ownable.get_owner()
    }

    pub fn transfer_ownership(&mut self, new_owner: &Address) {
        self.ownable.transfer_ownership(new_owner);
    }

    pub fn renounce_ownership(&mut self) {
        self.ownable.renounce_ownership();
    }

    /// Burn an NFT (only owner can burn)
    pub fn burn(&mut self, token_id: &U256) {
        // Only contract owner can burn
        self.ownable.assert_owner(&self.env().caller());

        // Ensure token exists
        self.core.assert_exists(token_id);

        let token_owner = self.core.owner_of(token_id);
        let balance = self.core.balance_of(&token_owner);

        // Update storage
        self.core.balances.set(&token_owner, balance - U256::from(1));
        self.core.owners.set(token_id, None);
        self.core.clear_approval(token_id);

        // Emit Transfer event (to zero address = burn)
        self.env().emit_event(Transfer {
            from: Some(token_owner),
            to: None,
            token_id: *token_id,
        });
    }

    // ===== Query Methods =====

    pub fn total_supply(&self) -> U256 {
        self.next_token_id.get_or_default()
    }

    pub fn max_supply(&self) -> U256 {
        self.max_supply.get_or_default()
    }

    pub fn minting_mode(&self) -> MintingMode {
        self.minting_mode.get_or_default()
    }

    pub fn token_uri(&self, token_id: &U256) -> String {
        // Return base_uri + token_id
        let base_uri = self.metadata.base_uri();
        alloc::format!("{}{}", base_uri, token_id)
    }
}
