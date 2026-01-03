/**
 * DEX Contract Integration Tests
 *
 * Tests that the DEX contract is deployed and accessible on testnet.
 * These tests make actual RPC calls to verify the contract exists.
 *
 * NOTE: These are minimal READ-ONLY integration tests that verify:
 * - Contract hash is valid and accessible on-chain
 * - Contract exists at the expected address
 *
 * Full MCP tool testing (pool queries, transaction building) happens
 * in unit tests with the actual tool implementations.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import {
  createTestnetClient,
  DEPLOYED_CONTRACTS,
  INTEGRATION_TEST_TIMEOUT,
  verifyContractExists
} from './utils.js';
import type { CasperClient } from '../../services/casper-client.js';

describe('DEX Contract Integration Tests', () => {
  let client: CasperClient;
  const contractAddress = DEPLOYED_CONTRACTS.dex;

  beforeAll(async () => {
    client = createTestnetClient();
  }, INTEGRATION_TEST_TIMEOUT);

  describe('Contract Deployment Verification', () => {
    it('should verify DEX contract exists on testnet', async () => {
      const exists = await verifyContractExists(client, contractAddress);
      expect(exists).toBe(true);
    }, INTEGRATION_TEST_TIMEOUT);

    it('should have correct contract address format', () => {
      expect(contractAddress).toMatch(/^hash-[a-f0-9]{64}$/);
      expect(contractAddress).toBe('hash-75bc6d255bd4173b4968776b6638d02d170d445f42e7c48e89bf99725426899a');
    });
  });
});
