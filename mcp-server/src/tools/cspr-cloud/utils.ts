/**
 * Utility functions for cspr.cloud tools
 */

// NOTE: Token and NFT utility functions removed - those endpoints are mainnet only
// For testnet, use custom contract tools instead

/**
 * Calculate total deploy count for a block
 */
export function calculateBlockDeployCount(block: {
  native_transfers_number: number;
  contract_calls_number: number;
  auction_txn_number: number;
  install_upgrade_txn_number: number;
}): number {
  return (
    block.native_transfers_number +
    block.contract_calls_number +
    block.auction_txn_number +
    block.install_upgrade_txn_number
  );
}
