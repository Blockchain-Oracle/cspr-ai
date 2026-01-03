import { describe, it, expect, beforeEach, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CasperClient } from '../../../services/casper-client.js';
import {
  registerDeployDexTool,
  registerQueryDexTool,
  registerBuildDexCreatePoolTool,
  registerBuildDexAddLiquidityTool,
  registerBuildDexRemoveLiquidityTool,
  registerBuildDexSwapTool
} from '../../../tools/contracts/dex.js';
import type {
  DeployDexInput,
  QueryDexInput,
  BuildDexCreatePoolInput,
  BuildDexAddLiquidityInput,
  BuildDexRemoveLiquidityInput,
  BuildDexSwapInput
} from '../../../types.js';
import { ResponseFormat } from '../../../constants.js';

describe('DEX Contract Tools', () => {
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

  describe('casper_deploy_dex', () => {
    beforeEach(() => {
      registerDeployDexTool(server, client);
    });

    it('should register the deploy DEX tool with correct metadata', () => {
      expect(server.registerTool).toHaveBeenCalledWith(
        'casper_deploy_dex',
        expect.objectContaining({
          title: expect.stringContaining('Deploy'),
          description: expect.any(String),
          inputSchema: expect.any(Object)
        }),
        expect.any(Function)
      );
    });

    it('should build DEX deployment transaction with valid inputs', async () => {
      const input: DeployDexInput = {
        deployer_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        default_fee_bps: 30
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('30 basis points');

      // Verify structured output
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.type).toBe('dex_deploy');
      expect(result.structuredContent.deployer).toBe(input.deployer_public_key);
      expect(result.structuredContent.default_fee_bps).toBe(30);
      expect(result.structuredContent.requires_signature).toBe(true);
      expect(result.structuredContent.unsigned_deploy).toBeDefined();
    });

    it('should handle errors with invalid public key format', async () => {
      const input: DeployDexInput = {
        deployer_public_key: 'invalid_key',
        default_fee_bps: 30
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
      expect(result.content[0].text.toLowerCase()).toContain('error');
    });

    it('should include deploy structure in unsigned deploy', async () => {
      const input: DeployDexInput = {
        deployer_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        default_fee_bps: 25
      };

      const result = await mockToolHandler(input);

      expect(result.structuredContent.unsigned_deploy).toBeDefined();
      const deploy = result.structuredContent.unsigned_deploy;
      expect(deploy.deployer).toBe(input.deployer_public_key);
      expect(deploy.chain_name).toBe('casper-test');
      expect(deploy.deploy_type).toBe('contract_deployment');
      expect(deploy.payment_amount).toBeDefined();
    });
  });

  describe('casper_query_dex', () => {
    beforeEach(() => {
      registerQueryDexTool(server, client);
    });

    it('should register the query DEX tool', () => {
      expect(server.registerTool).toHaveBeenCalledWith(
        'casper_query_dex',
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should query pool information', async () => {
      const input: QueryDexInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        query_type: 'pool',
        pool_id: '1',
        response_format: ResponseFormat.JSON
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.pool_id).toBeDefined();
      expect(result.structuredContent.token_a).toBeDefined();
      expect(result.structuredContent.token_b).toBeDefined();
    });

    it('should query pool count', async () => {
      const input: QueryDexInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        query_type: 'pool_count',
        response_format: ResponseFormat.JSON
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.pool_count).toBeDefined();
    });

    it('should query LP balance for provider', async () => {
      const input: QueryDexInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        query_type: 'lp_balance',
        pool_id: '1',
        provider: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        response_format: ResponseFormat.JSON
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.lp_balance).toBeDefined();
    });

    it('should query pool reserves', async () => {
      const input: QueryDexInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        query_type: 'reserves',
        pool_id: '1',
        response_format: ResponseFormat.JSON
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.reserve_a).toBeDefined();
      expect(result.structuredContent.reserve_b).toBeDefined();
    });

    it('should query swap quote', async () => {
      const input: QueryDexInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        query_type: 'swap_quote',
        pool_id: '1',
        token_in: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        amount_in: '1000',
        response_format: ResponseFormat.JSON
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.amount_out).toBeDefined();
    });
  });

  describe('casper_build_dex_create_pool', () => {
    beforeEach(() => {
      registerBuildDexCreatePoolTool(server, client);
    });

    it('should build DEX create pool transaction', async () => {
      const input: BuildDexCreatePoolInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        from_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        token_a: 'hash-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        token_b: 'hash-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.type).toBe('dex_create_pool');
      expect(result.structuredContent.creator).toBe(input.from_public_key);
      expect(result.structuredContent.token_a).toBe(input.token_a);
      expect(result.structuredContent.token_b).toBe(input.token_b);
      expect(result.structuredContent.requires_signature).toBe(true);
      expect(result.structuredContent.unsigned_deploy).toBeDefined();
    });

    it('should include caller in unsigned deploy', async () => {
      const input: BuildDexCreatePoolInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        from_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        token_a: 'hash-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        token_b: 'hash-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb'
      };

      const result = await mockToolHandler(input);

      const deploy = result.structuredContent.unsigned_deploy;
      expect(deploy.caller).toBe(input.from_public_key);
      expect(deploy.chain_name).toBe('casper-test');
      expect(deploy.payment_amount).toBeDefined();
    });
  });

  describe('casper_build_dex_add_liquidity', () => {
    beforeEach(() => {
      registerBuildDexAddLiquidityTool(server, client);
    });

    it('should build DEX add liquidity transaction', async () => {
      const input: BuildDexAddLiquidityInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        from_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        pool_id: '1',
        amount_a: '1000000',
        amount_b: '2000000',
        min_lp_tokens: '1400000'
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.type).toBe('dex_add_liquidity');
      expect(result.structuredContent.provider).toBe(input.from_public_key);
      expect(result.structuredContent.pool_id).toBe(input.pool_id);
      expect(result.structuredContent.amount_a).toBe(input.amount_a);
      expect(result.structuredContent.amount_b).toBe(input.amount_b);
      expect(result.structuredContent.requires_signature).toBe(true);
    });

    it('should include caller and payment in unsigned deploy', async () => {
      const input: BuildDexAddLiquidityInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        from_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        pool_id: '2',
        amount_a: '5000000',
        amount_b: '10000000',
        min_lp_tokens: '7000000'
      };

      const result = await mockToolHandler(input);

      const deploy = result.structuredContent.unsigned_deploy;
      expect(deploy.caller).toBe(input.from_public_key);
      expect(deploy.chain_name).toBe('casper-test');
      expect(deploy.payment_amount).toBeDefined();
    });
  });

  describe('casper_build_dex_remove_liquidity', () => {
    beforeEach(() => {
      registerBuildDexRemoveLiquidityTool(server, client);
    });

    it('should build DEX remove liquidity transaction', async () => {
      const input: BuildDexRemoveLiquidityInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        from_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        pool_id: '1',
        lp_tokens: '1000000',
        min_amount_a: '450000',
        min_amount_b: '900000'
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.type).toBe('dex_remove_liquidity');
      expect(result.structuredContent.provider).toBe(input.from_public_key);
      expect(result.structuredContent.pool_id).toBe(input.pool_id);
      expect(result.structuredContent.lp_tokens).toBe(input.lp_tokens);
      expect(result.structuredContent.requires_signature).toBe(true);
    });

    it('should include caller and payment in unsigned deploy', async () => {
      const input: BuildDexRemoveLiquidityInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        from_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        pool_id: '3',
        lp_tokens: '5000000',
        min_amount_a: '2250000',
        min_amount_b: '4500000'
      };

      const result = await mockToolHandler(input);

      const deploy = result.structuredContent.unsigned_deploy;
      expect(deploy.caller).toBe(input.from_public_key);
      expect(deploy.chain_name).toBe('casper-test');
      expect(deploy.payment_amount).toBeDefined();
    });
  });

  describe('casper_build_dex_swap', () => {
    beforeEach(() => {
      registerBuildDexSwapTool(server, client);
    });

    it('should build DEX swap transaction', async () => {
      const input: BuildDexSwapInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        from_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        pool_id: '1',
        token_in: 'hash-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
        amount_in: '1000000',
        min_amount_out: '900000'
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.type).toBe('dex_swap');
      expect(result.structuredContent.trader).toBe(input.from_public_key);
      expect(result.structuredContent.pool_id).toBe(input.pool_id);
      expect(result.structuredContent.token_in).toBe(input.token_in);
      expect(result.structuredContent.amount_in).toBe(input.amount_in);
      expect(result.structuredContent.requires_signature).toBe(true);
    });

    it('should include caller and payment in unsigned deploy', async () => {
      const input: BuildDexSwapInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        from_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        pool_id: '2',
        token_in: 'hash-bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
        amount_in: '5000000',
        min_amount_out: '4500000'
      };

      const result = await mockToolHandler(input);

      const deploy = result.structuredContent.unsigned_deploy;
      expect(deploy.caller).toBe(input.from_public_key);
      expect(deploy.payment_amount).toBeDefined();
    });
  });
});
