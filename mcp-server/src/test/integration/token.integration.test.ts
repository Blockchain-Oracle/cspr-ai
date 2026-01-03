/**
 * Token Contract Integration Tests
 *
 * Tests that the Token contract is deployed and accessible on testnet.
 * These tests make actual RPC calls to verify the contract exists.
 *
 * NOTE: These are minimal READ-ONLY integration tests that verify:
 * - Contract hash is valid and accessible on-chain
 * - Contract exists at the expected address
 *
 * Full MCP tool testing (metadata queries, transaction building) happens
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

describe('Token Contract Integration Tests', () => {
  let client: CasperClient;
  const contractAddress = DEPLOYED_CONTRACTS.token;

  beforeAll(async () => {
    client = createTestnetClient();
  }, INTEGRATION_TEST_TIMEOUT);

  describe('Contract Deployment Verification', () => {
    it('should verify Token contract exists on testnet', async () => {
      const exists = await verifyContractExists(client, contractAddress);
      expect(exists).toBe(true);
    }, INTEGRATION_TEST_TIMEOUT);

    it('should have correct contract address format', () => {
      expect(contractAddress).toMatch(/^hash-[a-f0-9]{64}$/);
      expect(contractAddress).toBe('hash-810963e7e989ccc987683a2d1bcb4e17762f6511f06c306393dfd84c4db10995');
    });
  });
});
