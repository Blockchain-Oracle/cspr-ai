/**
 * Shared constants for Casper transaction utilities
 *
 * These constants are shared between MCP server and web frontend
 * to ensure consistency in payment amounts and contract addresses.
 */

// CSPR units (1 CSPR = 1 billion motes)
export const MOTES_PER_CSPR = 1_000_000_000;

// Payment amounts in motes
export const PAYMENT_TRANSFER_MOTES = 100_000_000;      // 0.1 CSPR for native transfers
export const PAYMENT_CONTRACT_CALL_MOTES = 3_000_000_000;  // 3 CSPR for contract calls
export const PAYMENT_DELEGATION_MOTES = 2_500_000_000;  // 2.5 CSPR for delegation

// Minimum valid payment (0.01 CSPR) - used for validation
export const MIN_VALID_PAYMENT_MOTES = 10_000_000;

// Auction contract hash (for delegation transactions)
// This is the system auction contract on both testnet and mainnet
export const AUCTION_CONTRACT_HASH = "93d923e336b20a4c4ca14d592b60e5bd3fe330775618290104f9beb326db7ae2";

// Deployed contract addresses on testnet - January 2025 Odra deployment
// From contracts/deployment.log
export const CSPR_AI_CONTRACTS = {
  testnet: {
    token: "b481b1e86bc2a1c5d73d5e108c6246ad0358889acc9ef0f429bd4cb454a3bc05",
    nft: "195b64a1cca143d9361790af34ef79d3094bb00094330c1ccc1cd4987c0b583b",
    dao: "91083a42df41a577f2d5695ad4c78f799dc1d3016eccef4ce2a6f9a43c68506f",
    dex: "7f09f5c808f2a3a684d70cfe49cec2c6b90c11aa1d8053046d91fd26a342bca1",
  },
  mainnet: {
    token: null as string | null,
    nft: null as string | null,
    dao: null as string | null,
    dex: null as string | null,
  }
} as const;

// Helper to get contract address with hash prefix for queries
export function getContractAddressWithPrefix(
  contract: keyof typeof CSPR_AI_CONTRACTS.testnet,
  network: 'testnet' | 'mainnet' = 'testnet'
): string | null {
  const hash = CSPR_AI_CONTRACTS[network][contract];
  return hash ? `hash-${hash}` : null;
}
