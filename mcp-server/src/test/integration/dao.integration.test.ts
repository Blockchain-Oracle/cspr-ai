/**
 * DAO Contract Integration Tests
 *
 * Tests that the DAO contract is deployed and accessible on testnet.
 * These tests make actual RPC calls to verify the contract exists.
 *
 * NOTE: These are minimal READ-ONLY integration tests that verify:
 * - Contract hash is valid and accessible on-chain
 * - Contract exists at the expected address
 *
 * Full MCP tool testing (config queries, proposal building, voting) happens
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

describe('DAO Contract Integration Tests', () => {
  let client: CasperClient;
  const contractAddress = DEPLOYED_CONTRACTS.dao;

  beforeAll(async () => {
    client = createTestnetClient();
  }, INTEGRATION_TEST_TIMEOUT);

  describe('Contract Deployment Verification', () => {
    it('should verify DAO contract exists on testnet', async () => {
      const exists = await verifyContractExists(client, contractAddress);
      expect(exists).toBe(true);
    }, INTEGRATION_TEST_TIMEOUT);

    it('should have correct contract address format', () => {
      expect(contractAddress).toMatch(/^hash-[a-f0-9]{64}$/);
      expect(contractAddress).toBe('hash-f41a989359447ae236015956e9d3d0f80e0c92112ed5b6b12a1a4eef14998d8e');
    });
  });
});
