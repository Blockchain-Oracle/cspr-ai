/**
 * Integration Test Utilities
 *
 * Utilities for testing MCP tools against REAL deployed contracts on Casper testnet.
 * These tests make actual network calls and interact with live blockchain state.
 */

import { CasperClient } from '../../services/casper-client.js';
import { TESTNET_RPC_URL, CSPR_AI_CONTRACTS } from '../../constants.js';

/**
 * Create a real Casper client for testnet integration tests
 */
export function createTestnetClient(): CasperClient {
  // Get API key from environment (optional, but recommended for cspr.cloud)
  const apiKey = process.env.CSPR_CLOUD_API_KEY;
  const client = new CasperClient(TESTNET_RPC_URL, apiKey);
  return client;
}

/**
 * Get deployed contract addresses for testnet
 */
export const DEPLOYED_CONTRACTS = CSPR_AI_CONTRACTS.testnet;

/**
 * Test account public key (from .env - read-only operations)
 */
export const TEST_PUBLIC_KEY = '01685a707da16d6be2e0f9b7c3dfbce485611719f5a48210445730256d409d9889';

/**
 * Network configuration
 */
export const TEST_NETWORK = 'casper-test';

/**
 * Sleep utility for handling rate limits or waiting for state
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Verify contract exists on chain
 */
export async function verifyContractExists(
  client: CasperClient,
  contractHash: string
): Promise<boolean> {
  try {
    // Use queryLatestGlobalState to verify contract exists
    await client.queryLatestGlobalState(contractHash, []);
    return true;
  } catch (error) {
    console.error(`Contract ${contractHash} not found:`, error);
    return false;
  }
}

/**
 * Integration test timeout (longer than unit tests)
 */
export const INTEGRATION_TEST_TIMEOUT = 30000; // 30 seconds
