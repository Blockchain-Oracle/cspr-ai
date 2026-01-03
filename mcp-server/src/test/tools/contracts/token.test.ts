import { describe, it, expect, beforeEach, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CasperClient } from '../../../services/casper-client.js';
import {
  registerDeployTokenTool,
  registerQueryTokenTool,
  registerBuildTokenTransferTool,
  registerBuildTokenMintTool,
  registerBuildTokenBurnTool
} from '../../../tools/contracts/token.js';
import type {
  DeployTokenInput,
  QueryTokenInput,
  BuildTokenTransferInput,
  BuildTokenMintInput,
  BuildTokenBurnInput
} from '../../../types.js';
import { ResponseFormat } from '../../../constants.js';

describe('Token Contract Tools', () => {
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

  describe('casper_deploy_token', () => {
    beforeEach(() => {
      registerDeployTokenTool(server, client);
    });

    it('should register the deploy token tool with correct metadata', () => {
      expect(server.registerTool).toHaveBeenCalledWith(
        'casper_deploy_token',
        expect.objectContaining({
          title: expect.stringContaining('Deploy'),
          description: expect.any(String),
          inputSchema: expect.any(Object)
        }),
        expect.any(Function)
      );
    });

    it('should build deployment transaction with valid inputs', async () => {
      const input: DeployTokenInput = {
        deployer_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        name: 'Test Token',
        symbol: 'TEST',
        decimals: 18,
        initial_supply: '1000000',
        enable_minting: true
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Test Token');
      expect(result.content[0].text).toContain('TEST');

      // Verify structured output
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.type).toBe('token_deploy');
      expect(result.structuredContent.deployer).toBe(input.deployer_public_key);
      expect(result.structuredContent.token_name).toBe('Test Token');
      expect(result.structuredContent.token_symbol).toBe('TEST');
      expect(result.structuredContent.decimals).toBe(18);
      expect(result.structuredContent.requires_signature).toBe(true);
      expect(result.structuredContent.unsigned_deploy).toBeDefined();
    });

    it('should handle errors with invalid public key format', async () => {
      const input: DeployTokenInput = {
        deployer_public_key: 'invalid_key',
        name: 'Test Token',
        symbol: 'TEST',
        decimals: 18,
        initial_supply: '1000000',
        enable_minting: true
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
      expect(result.content[0].text.toLowerCase()).toContain('error');
    });

    it('should include deploy structure in unsigned deploy', async () => {
      const input: DeployTokenInput = {
        deployer_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        name: 'My Token',
        symbol: 'MTK',
        decimals: 8,
        initial_supply: '5000000',
        enable_minting: false
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

  describe('casper_query_token', () => {
    beforeEach(() => {
      registerQueryTokenTool(server, client);
    });

    it('should register the query token tool', () => {
      expect(server.registerTool).toHaveBeenCalledWith(
        'casper_query_token',
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should query token balance with valid inputs', async () => {
      const input: QueryTokenInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        query_type: 'balance',
        owner: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        response_format: ResponseFormat.JSON
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.contract_address).toBe(input.contract_address);
      expect(result.structuredContent.owner).toBe(input.owner);
      expect(result.structuredContent.balance).toBeDefined();
    });

    it('should query token metadata without owner', async () => {
      const input: QueryTokenInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        query_type: 'metadata',
        response_format: ResponseFormat.JSON
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.name).toBeDefined();
      expect(result.structuredContent.symbol).toBeDefined();
      expect(result.structuredContent.decimals).toBeDefined();
    });

    it('should query total supply', async () => {
      const input: QueryTokenInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        query_type: 'supply',
        response_format: ResponseFormat.JSON
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.total_supply).toBeDefined();
    });

    it('should query allowance with owner and spender', async () => {
      const input: QueryTokenInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        query_type: 'allowance',
        owner: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        spender: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef02',
        response_format: ResponseFormat.JSON
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.allowance).toBeDefined();
    });
  });

  describe('casper_build_token_transfer', () => {
    beforeEach(() => {
      registerBuildTokenTransferTool(server, client);
    });

    it('should build token transfer transaction', async () => {
      const input: BuildTokenTransferInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        from_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        recipient: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef02',
        amount: '1000000'
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.type).toBe('token_transfer');
      expect(result.structuredContent.from).toBe(input.from_public_key);
      expect(result.structuredContent.to).toBe(input.recipient);
      expect(result.structuredContent.amount).toBe(input.amount);
      expect(result.structuredContent.requires_signature).toBe(true);
      expect(result.structuredContent.unsigned_deploy).toBeDefined();
    });

    it('should include header and payment in unsigned deploy', async () => {
      const input: BuildTokenTransferInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        from_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        recipient: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef02',
        amount: '500000'
      };

      const result = await mockToolHandler(input);

      const deploy = result.structuredContent.unsigned_deploy;
      expect(deploy.header).toBeDefined();
      expect(deploy.header.account).toBe(input.from_public_key);
      expect(deploy.header.chain_name).toBe('casper-test');
      expect(deploy.payment).toBeDefined();
    });
  });

  describe('casper_build_token_mint', () => {
    beforeEach(() => {
      registerBuildTokenMintTool(server, client);
    });

    it('should build token mint transaction', async () => {
      const input: BuildTokenMintInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        from_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        recipient: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef02',
        amount: '1000000'
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.type).toBe('token_mint');
      expect(result.structuredContent.minter).toBe(input.from_public_key);
      expect(result.structuredContent.recipient).toBe(input.recipient);
      expect(result.structuredContent.amount).toBe(input.amount);
      expect(result.structuredContent.requires_signature).toBe(true);
    });

    it('should include header in unsigned deploy', async () => {
      const input: BuildTokenMintInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        from_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        recipient: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef02',
        amount: '2000000'
      };

      const result = await mockToolHandler(input);

      const deploy = result.structuredContent.unsigned_deploy;
      expect(deploy.header).toBeDefined();
      expect(deploy.header.account).toBe(input.from_public_key);
    });
  });

  describe('casper_build_token_burn', () => {
    beforeEach(() => {
      registerBuildTokenBurnTool(server, client);
    });

    it('should build token burn transaction', async () => {
      const input: BuildTokenBurnInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        from_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        amount: '500000'
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.type).toBe('token_burn');
      expect(result.structuredContent.burner).toBe(input.from_public_key);
      expect(result.structuredContent.amount).toBe(input.amount);
      expect(result.structuredContent.requires_signature).toBe(true);
    });

    it('should include header and payment in unsigned deploy', async () => {
      const input: BuildTokenBurnInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        from_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        amount: '100000'
      };

      const result = await mockToolHandler(input);

      const deploy = result.structuredContent.unsigned_deploy;
      expect(deploy.header).toBeDefined();
      expect(deploy.header.account).toBe(input.from_public_key);
      expect(deploy.payment).toBeDefined();
    });
  });
});
