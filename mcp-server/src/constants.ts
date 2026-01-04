/**
 * Constants for the Casper MCP Server
 */

// Default RPC endpoints (using public Casper Network nodes - no auth required)
// cspr.cloud nodes require API key: https://node.testnet.cspr.cloud/rpc
export const TESTNET_RPC_URL = "https://node.testnet.casper.network/rpc";
export const MAINNET_RPC_URL = "https://node.mainnet.casper.network/rpc";

// CSPR units (1 CSPR = 1 billion motes)
export const MOTES_PER_CSPR = BigInt(1_000_000_000);

// Character limit for responses
export const CHARACTER_LIMIT = 25000;

// Default pagination
export const DEFAULT_LIMIT = 20;
export const MAX_LIMIT = 100;

// Response format enum
export enum ResponseFormat {
  MARKDOWN = "markdown",
  JSON = "json"
}

// Deploy configuration
export const DEPLOY_TTL = "30m";
export const GAS_PRICE = 1;

// Gas payment amounts (CLValue U512 encoding)
// These bytes represent the payment amounts for transaction fees
// Format: length prefix + little-endian value
//
// Transfer: 0.1 CSPR = 100,000,000 motes = 0x05F5E100
export const TRANSFER_PAYMENT_BYTES = "0500e1f505";
export const TRANSFER_PAYMENT_MOTES = 100_000_000;

// Delegation: 2.5 CSPR = 2,500,000,000 motes = 0x9502F900
// Encoding: length prefix (04) + little-endian bytes (00 F9 02 95)
export const DELEGATION_PAYMENT_BYTES = "0400f90295";
export const DELEGATION_PAYMENT_MOTES = 2_500_000_000;

// Contract calls: 3 CSPR = 3,000,000,000 motes (for token/NFT/DAO/DEX operations)
export const CONTRACT_PAYMENT_MOTES = 3_000_000_000;

// Staking constraints
export const MIN_DELEGATION_CSPR = 500;

// Auction contract hash (for delegation transactions)
// This is the system auction contract on both testnet and mainnet
export const AUCTION_CONTRACT_HASH = "93d923e336b20a4c4ca14d592b60e5bd3fe330775618290104f9beb326db7ae2";

// Memo constraints
export const MAX_MEMO_LENGTH = 100;

// ============================================================================
// CSPR.AI Deployed Contracts (Testnet)
// ============================================================================
// These contract addresses are deployed on Casper Testnet (casper-test)
// Deployed: 2024-12-27

export const CSPR_AI_CONTRACTS = {
  testnet: {
    // January 2025 Odra deployment (from contracts/deployment.log)
    token: "contract-package-b481b1e86bc2a1c5d73d5e108c6246ad0358889acc9ef0f429bd4cb454a3bc05",
    nft: "contract-package-195b64a1cca143d9361790af34ef79d3094bb00094330c1ccc1cd4987c0b583b",
    dao: "contract-package-91083a42df41a577f2d5695ad4c78f799dc1d3016eccef4ce2a6f9a43c68506f",
    dex: "contract-package-7f09f5c808f2a3a684d70cfe49cec2c6b90c11aa1d8053046d91fd26a342bca1"
  },
  mainnet: {
    token: null,  // Not yet deployed
    nft: null,
    dao: null,
    dex: null
  }
} as const;
