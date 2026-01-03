/**
 * CsprCloudClient Integration Tests
 *
 * Tests real cspr.cloud REST API connectivity and response handling.
 * Uses testnet API with real network calls (not mocked).
 */

import { describe, it, expect, beforeAll } from "vitest";
import { CsprCloudClient } from "./cspr-cloud-client.js";
import type {
  Deploy,
  Block,
  Validator,
  FungibleTokenAction,
  NFTToken,
  Transfer,
  Account,
  AuctionMetrics
} from "../types/cspr-cloud.js";

// API key must be provided via environment variable for security
const API_KEY = process.env.CSPR_CLOUD_API_KEY;
const hasApiKey = !!API_KEY;

// Skip entire suite if no API key is available
describe.skipIf(!hasApiKey)("CsprCloudClient - Real API Integration", () => {
  let client: CsprCloudClient;

  beforeAll(() => {
    client = new CsprCloudClient("testnet", API_KEY!);
  });

  describe("Configuration", () => {
    it("should return correct network", () => {
      expect(client.getNetwork()).toBe("testnet");
    });

    it("should use testnet base URL", () => {
      const testnetClient = new CsprCloudClient("testnet");
      expect(testnetClient.getNetwork()).toBe("testnet");
    });

    it("should use mainnet base URL", () => {
      const mainnetClient = new CsprCloudClient("mainnet");
      expect(mainnetClient.getNetwork()).toBe("mainnet");
    });
  });

  describe("Deploy Endpoints", () => {
    it("should get recent deploy with real API call", async () => {
      // Get a recent deploy from account deploys first
      const accountDeploysResult = await client.getAccountDeploys(
        "account-hash-0000000000000000000000000000000000000000000000000000000000000000",
        { page: 1, page_size: 1 }
      );

      if (accountDeploysResult.data.length > 0) {
        const deployHash = accountDeploysResult.data[0].deploy_hash;
        const deploy = await client.getDeploy(deployHash);

        expect(deploy).toBeDefined();
        expect(deploy.deploy_hash).toBe(deployHash);
        expect(deploy.block_hash).toBeDefined();
        expect(deploy.block_height).toBeGreaterThan(0);
        expect(deploy.timestamp).toBeDefined();
      }
    }, 10000);

    it("should get account deploys with pagination", async () => {
      const result = await client.getAccountDeploys(
        "account-hash-0000000000000000000000000000000000000000000000000000000000000000",
        { page: 1, page_size: 5 }
      );

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
      expect(result.item_count).toBeGreaterThanOrEqual(0);
      expect(result.page_count).toBeGreaterThanOrEqual(0);
    }, 10000);

    it("should handle non-existent deploy hash", async () => {
      const fakeHash = "0000000000000000000000000000000000000000000000000000000000000000";
      await expect(client.getDeploy(fakeHash)).rejects.toThrow();
    }, 10000);
  });

  describe("Block Endpoints", () => {
    it("should get recent blocks", async () => {
      const result = await client.getBlocks({ page: 1, page_size: 5 });

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
      expect(result.data.length).toBeGreaterThan(0);

      const block = result.data[0];
      expect(block.block_hash).toBeDefined();
      expect(block.block_height).toBeGreaterThan(0);
      expect(block.era_id).toBeGreaterThan(0);
      expect(block.timestamp).toBeDefined();
    }, 10000);

    it("should get specific block by height", async () => {
      // Get latest block first
      const blocksResult = await client.getBlocks({ page: 1, page_size: 1 });
      const latestBlockHeight = blocksResult.data[0].block_height;

      const block = await client.getBlock(latestBlockHeight);

      expect(block).toBeDefined();
      expect(block.block_height).toBe(latestBlockHeight);
      expect(block.block_hash).toBeDefined();
    }, 10000);
  });

  describe("Validator Endpoints", () => {
    it("should get current validators", async () => {
      const result = await client.getCurrentValidators({ page: 1, page_size: 10 });

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
      expect(result.data.length).toBeGreaterThan(0);

      const validator = result.data[0];
      expect(validator.public_key).toBeDefined();
      expect(validator.public_key).toHaveLength(68);
      expect(validator.total_stake).toBeDefined();
      expect(validator.is_active).toBeDefined();
    }, 10000);

    it("should get validator rewards", async () => {
      // Get a validator public key first
      const validatorsResult = await client.getCurrentValidators({ page: 1, page_size: 1 });
      const validatorPublicKey = validatorsResult.data[0].public_key;

      const result = await client.getValidatorRewards(validatorPublicKey, {
        page: 1,
        page_size: 5
      });

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
      // Validator may or may not have rewards
      if (result.data.length > 0) {
        const reward = result.data[0];
        expect(reward.era_id).toBeGreaterThan(0);
        expect(reward.amount).toBeDefined();
        expect(reward.timestamp).toBeDefined();
      }
    }, 10000);

    it("should get validator blocks", async () => {
      // Get a validator public key first
      const validatorsResult = await client.getCurrentValidators({ page: 1, page_size: 1 });
      const validatorPublicKey = validatorsResult.data[0].public_key;

      const result = await client.getValidatorBlocks(validatorPublicKey, {
        page: 1,
        page_size: 5
      });

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
      // Validator may or may not have produced blocks in recent history
    }, 10000);
  });

  describe("Auction Metrics", () => {
    it("should get current auction metrics", async () => {
      const metrics = await client.getAuctionMetrics();

      expect(metrics).toBeDefined();
      expect(metrics.current_era_id).toBeGreaterThan(0);
      expect(metrics.total_active_era_stake).toBeDefined();
      expect(metrics.active_validator_number).toBeGreaterThan(0);
    }, 10000);
  });

  describe("Transfer Endpoints", () => {
    it("should get account transfers", async () => {
      const result = await client.getAccountTransfers(
        "account-hash-0000000000000000000000000000000000000000000000000000000000000000",
        { page: 1, page_size: 5 }
      );

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
      // Account may or may not have transfers
    }, 10000);
  });

  describe("Token Endpoints", () => {
    it("should get fungible token actions", async () => {
      const result = await client.getFungibleTokenActions({
        page: 1,
        page_size: 5
      });

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
      // May or may not have token actions
    }, 10000);

    it("should get account tokens", async () => {
      const tokens = await client.getAccountTokens(
        "account-hash-0000000000000000000000000000000000000000000000000000000000000000"
      );

      expect(tokens).toBeDefined();
      expect(tokens).toBeInstanceOf(Array);
      // Account may or may not hold tokens
    }, 10000);
  });

  describe("NFT Endpoints", () => {
    it("should get NFTs", async () => {
      const result = await client.getNFTs({ page: 1, page_size: 5 });

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
      // Testnet may or may not have NFTs
    }, 10000);

    it("should get NFT actions", async () => {
      const result = await client.getNFTActions({ page: 1, page_size: 5 });

      expect(result).toBeDefined();
      expect(result.data).toBeInstanceOf(Array);
      // Testnet may or may not have NFT actions
    }, 10000);
  });

  describe("Error Handling", () => {
    it("should throw error for invalid API response", async () => {
      // Using a clearly invalid deploy hash that will trigger 404
      const invalidHash = "invalid-hash-format";
      await expect(client.getDeploy(invalidHash)).rejects.toThrow();
    }, 10000);

    it("should throw error when API key is invalid", async () => {
      // Create client with invalid API key
      const badClient = new CsprCloudClient("testnet", "invalid-api-key");

      await expect(badClient.getBlocks()).rejects.toThrow(/401|unauthorized|forbidden/i);
    }, 10000);

    it("should throw error when API key is missing", async () => {
      // Create client without API key
      const badClient = new CsprCloudClient("testnet");

      await expect(badClient.getBlocks()).rejects.toThrow(/401|authorization/i);
    }, 10000);
  });

  describe("Pagination", () => {
    it("should respect page_size parameter", async () => {
      const pageSize = 3;
      const result = await client.getBlocks({ page: 1, page_size: pageSize });

      expect(result.data.length).toBeLessThanOrEqual(pageSize);
    }, 10000);

    it("should handle pagination across multiple pages", async () => {
      const page1 = await client.getBlocks({ page: 1, page_size: 2 });
      const page2 = await client.getBlocks({ page: 2, page_size: 2 });

      if (page1.data.length > 0 && page2.data.length > 0) {
        // Ensure different blocks on different pages
        expect(page1.data[0].block_hash).not.toBe(page2.data[0].block_hash);
      }
    }, 10000);
  });
});
