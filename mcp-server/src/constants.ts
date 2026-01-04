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
export const DELEGATION_PAYMENT_BYTES = "050094357700";
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
    token: "hash-810963e7e989ccc987683a2d1bcb4e17762f6511f06c306393dfd84c4db10995",
    nft: "hash-5536ec2a8dbfd8d10328dec3b424df9b6c3fe8ac2af43910aa33f102d26bb33c",
    dao: "hash-34690764369a383b8b28f9258f2fcfe3724d27c368b3cd6faf255db5c3e0ab86",
    dex: "hash-5909fb339b1c63c6df67180a2efbcdab41fa234bc8a85ebc96c7faa5aa1e3e94"
  },
  mainnet: {
    token: null,  // Not yet deployed
    nft: null,
    dao: null,
    dex: null
  }
} as const;
