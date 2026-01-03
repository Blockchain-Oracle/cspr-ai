import { describe, it, expect, beforeEach, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CasperClient } from '../../../services/casper-client.js';
import {
  registerDeployNftTool,
  registerQueryNftTool,
  registerBuildNftMintTool,
  registerBuildNftTransferTool,
  registerBuildNftBurnTool
} from '../../../tools/contracts/nft.js';
import type {
  DeployNftInput,
  QueryNftInput,
  BuildNftMintInput,
  BuildNftTransferInput,
  BuildNftBurnInput
} from '../../../types.js';
import { ResponseFormat } from '../../../constants.js';

describe('NFT Contract Tools', () => {
  let server: McpServer;
  let client: CasperClient;
  let mockToolHandler: any;

  beforeEach(() => {
    // Create mock MCP server
    server = {
      registerTool: vi.fn((name, metadata, handler) => {
        mockToolHandler = handler;
      })
    } as any;

    // Create mock Casper client
    client = {
      getChainName: vi.fn(() => 'casper-test'),
      getNetwork: vi.fn(() => ({ name: 'casper-test', nodeUrl: 'http://test' }))
    } as any;
  });

  describe('casper_deploy_nft', () => {
    beforeEach(() => {
      registerDeployNftTool(server, client);
    });

    it('should register the deploy NFT tool with correct metadata', () => {
      expect(server.registerTool).toHaveBeenCalledWith(
        'casper_deploy_nft',
        expect.objectContaining({
          title: expect.stringContaining('Deploy'),
          description: expect.any(String),
          inputSchema: expect.any(Object)
        }),
        expect.any(Function)
      );
    });

    it('should build NFT deployment transaction with valid inputs', async () => {
      const input: DeployNftInput = {
        deployer_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        name: 'Test NFTs',
        symbol: 'TNFT',
        base_uri: 'https://example.com/metadata/',
        max_supply: '1000',
        minting_mode: 'public'
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Test NFTs');
      expect(result.content[0].text).toContain('TNFT');

      // Verify structured output
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.type).toBe('nft_deploy');
      expect(result.structuredContent.deployer).toBe(input.deployer_public_key);
      expect(result.structuredContent.collection_name).toBe('Test NFTs');
      expect(result.structuredContent.collection_symbol).toBe('TNFT');
      expect(result.structuredContent.requires_signature).toBe(true);
      expect(result.structuredContent.unsigned_deploy).toBeDefined();
    });

    it('should handle errors with invalid public key format', async () => {
      const input: DeployNftInput = {
        deployer_public_key: 'invalid_key',
        name: 'Test NFTs',
        symbol: 'TNFT',
        base_uri: 'https://example.com/metadata/',
        max_supply: '1000',
        minting_mode: 'public'
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
      expect(result.content[0].text.toLowerCase()).toContain('error');
    });

    it('should include deploy structure in unsigned deploy', async () => {
      const input: DeployNftInput = {
        deployer_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        name: 'My NFTs',
        symbol: 'MNFT',
        base_uri: 'https://example.com/nft/',
        max_supply: '500',
        minting_mode: 'restricted'
      };

      const result = await mockToolHandler(input);

      expect(result.structuredContent.unsigned_deploy).toBeDefined();
      const deploy = result.structuredContent.unsigned_deploy;
      expect(deploy.header).toBeDefined();
      expect(deploy.header.account).toBe(input.deployer_public_key);
      expect(deploy.header.chain_name).toBe('casper-test');
      expect(deploy.payment).toBeDefined();
    });
  });

  describe('casper_query_nft', () => {
    beforeEach(() => {
      registerQueryNftTool(server, client);
    });

    it('should register the query NFT tool', () => {
      expect(server.registerTool).toHaveBeenCalledWith(
        'casper_query_nft',
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should query NFT collection info', async () => {
      const input: QueryNftInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        query_type: 'collection_info',
        response_format: ResponseFormat.JSON
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.name).toBeDefined();
      expect(result.structuredContent.symbol).toBeDefined();
      expect(result.structuredContent.total_supply).toBeDefined();
    });

    it('should query NFT owner with token ID', async () => {
      const input: QueryNftInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        query_type: 'owner',
        token_id: '42',
        response_format: ResponseFormat.JSON
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.owner).toBeDefined();
    });

    it('should query NFT balance for owner', async () => {
      const input: QueryNftInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        query_type: 'balance',
        owner: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        response_format: ResponseFormat.JSON
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.balance).toBeDefined();
    });

    it('should query NFT metadata with token ID', async () => {
      const input: QueryNftInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        query_type: 'metadata',
        token_id: '100',
        response_format: ResponseFormat.JSON
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.name).toBeDefined();
      expect(result.structuredContent.token_uri).toBeDefined();
      expect(result.structuredContent.owner).toBeDefined();
    });
  });

  describe('casper_build_nft_mint', () => {
    beforeEach(() => {
      registerBuildNftMintTool(server, client);
    });

    it('should build NFT mint transaction', async () => {
      const input: BuildNftMintInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        from_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        to: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef02',
        token_name: 'NFT #123',
        token_uri: 'https://example.com/nft/123.json'
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.type).toBe('nft_mint');
      expect(result.structuredContent.minter).toBe(input.from_public_key);
      expect(result.structuredContent.recipient).toBe(input.to);
      expect(result.structuredContent.token_name).toBe(input.token_name);
      expect(result.structuredContent.requires_signature).toBe(true);
      expect(result.structuredContent.unsigned_deploy).toBeDefined();
    });

    it('should include header in unsigned deploy', async () => {
      const input: BuildNftMintInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        from_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        to: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef02',
        token_name: 'NFT #456',
        token_uri: 'https://example.com/nft/456.json'
      };

      const result = await mockToolHandler(input);

      const deploy = result.structuredContent.unsigned_deploy;
      expect(deploy.header).toBeDefined();
      expect(deploy.header.account).toBe(input.from_public_key);
      expect(deploy.header.chain_name).toBe('casper-test');
      expect(deploy.payment).toBeDefined();
    });
  });

  describe('casper_build_nft_transfer', () => {
    beforeEach(() => {
      registerBuildNftTransferTool(server, client);
    });

    it('should build NFT transfer transaction', async () => {
      const input: BuildNftTransferInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        from_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        from: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        to: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef02',
        token_id: '789'
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.type).toBe('nft_transfer');
      expect(result.structuredContent.from).toBe(input.from_public_key);
      expect(result.structuredContent.to).toBe(input.to);
      expect(result.structuredContent.token_id).toBe(input.token_id);
      expect(result.structuredContent.requires_signature).toBe(true);
      expect(result.structuredContent.unsigned_deploy).toBeDefined();
    });

    it('should include header and payment in unsigned deploy', async () => {
      const input: BuildNftTransferInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        from_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        from: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        to: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef02',
        token_id: '999'
      };

      const result = await mockToolHandler(input);

      const deploy = result.structuredContent.unsigned_deploy;
      expect(deploy.header).toBeDefined();
      expect(deploy.header.account).toBe(input.from_public_key);
      expect(deploy.header.chain_name).toBe('casper-test');
      expect(deploy.payment).toBeDefined();
    });
  });

  describe('casper_build_nft_burn', () => {
    beforeEach(() => {
      registerBuildNftBurnTool(server, client);
    });

    it('should build NFT burn transaction', async () => {
      const input: BuildNftBurnInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        from_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        token_id: '111'
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.type).toBe('nft_burn');
      expect(result.structuredContent.burner).toBe(input.from_public_key);
      expect(result.structuredContent.token_id).toBe(input.token_id);
      expect(result.structuredContent.requires_signature).toBe(true);
    });

    it('should include header and payment in unsigned deploy', async () => {
      const input: BuildNftBurnInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        from_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        token_id: '222'
      };

      const result = await mockToolHandler(input);

      const deploy = result.structuredContent.unsigned_deploy;
      expect(deploy.header).toBeDefined();
      expect(deploy.header.account).toBe(input.from_public_key);
      expect(deploy.payment).toBeDefined();
    });
  });
});
