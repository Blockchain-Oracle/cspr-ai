import { describe, it, expect, beforeEach, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { CasperClient } from '../../../services/casper-client.js';
import {
  registerDeployDaoTool,
  registerQueryDaoTool,
  registerBuildDaoProposeTool,
  registerBuildDaoVoteTool,
  registerBuildDaoExecuteTool
} from '../../../tools/contracts/dao.js';
import type {
  DeployDaoInput,
  QueryDaoInput,
  BuildDaoProposeInput,
  BuildDaoVoteInput,
  BuildDaoExecuteInput
} from '../../../types.js';
import { ResponseFormat } from '../../../constants.js';

describe('DAO Contract Tools', () => {
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

  describe('casper_deploy_dao', () => {
    beforeEach(() => {
      registerDeployDaoTool(server, client);
    });

    it('should register the deploy DAO tool with correct metadata', () => {
      expect(server.registerTool).toHaveBeenCalledWith(
        'casper_deploy_dao',
        expect.objectContaining({
          title: expect.stringContaining('Deploy'),
          description: expect.any(String),
          inputSchema: expect.any(Object)
        }),
        expect.any(Function)
      );
    });

    it('should build DAO deployment transaction with valid inputs', async () => {
      const input: DeployDaoInput = {
        deployer_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        token_name: 'My DAO Token',
        token_symbol: 'MDT',
        initial_supply: '1000000',
        voting_period_ms: '604800000',
        proposal_threshold: '100',
        quorum: '500'
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.content).toBeDefined();
      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('My DAO Token');
      expect(result.content[0].text).toContain('MDT');

      // Verify structured output
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.type).toBe('dao_deploy');
      expect(result.structuredContent.deployer).toBe(input.deployer_public_key);
      expect(result.structuredContent.token_name).toBe('My DAO Token');
      expect(result.structuredContent.token_symbol).toBe('MDT');
      expect(result.structuredContent.requires_signature).toBe(true);
      expect(result.structuredContent.unsigned_deploy).toBeDefined();
    });

    it('should handle errors with invalid public key format', async () => {
      const input: DeployDaoInput = {
        deployer_public_key: 'invalid_key',
        token_name: 'My DAO Token',
        token_symbol: 'MDT',
        initial_supply: '1000000',
        voting_period_ms: '604800000',
        proposal_threshold: '100',
        quorum: '500'
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.isError).toBe(true);
      expect(result.content[0].text.toLowerCase()).toContain('error');
    });

    it('should include deploy structure in unsigned deploy', async () => {
      const input: DeployDaoInput = {
        deployer_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        token_name: 'Community DAO',
        token_symbol: 'CDAO',
        initial_supply: '500000',
        voting_period_ms: '86400000',
        proposal_threshold: '50',
        quorum: '250'
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

  describe('casper_query_dao', () => {
    beforeEach(() => {
      registerQueryDaoTool(server, client);
    });

    it('should register the query DAO tool', () => {
      expect(server.registerTool).toHaveBeenCalledWith(
        'casper_query_dao',
        expect.any(Object),
        expect.any(Function)
      );
    });

    it('should query DAO config', async () => {
      const input: QueryDaoInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        query_type: 'config',
        response_format: ResponseFormat.JSON
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.voting_period_ms).toBeDefined();
      expect(result.structuredContent.proposal_threshold).toBeDefined();
      expect(result.structuredContent.quorum).toBeDefined();
    });

    it('should query DAO proposal with proposal ID', async () => {
      const input: QueryDaoInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        query_type: 'proposal',
        proposal_id: '1',
        response_format: ResponseFormat.JSON
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.proposal_id).toBeDefined();
      expect(result.structuredContent.description).toBeDefined();
      expect(result.structuredContent.status).toBeDefined();
    });

    it('should query DAO vote with proposal ID and voter', async () => {
      const input: QueryDaoInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        query_type: 'vote',
        proposal_id: '1',
        voter: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        response_format: ResponseFormat.JSON
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.support).toBeDefined();
      expect(result.structuredContent.amount).toBeDefined();
    });

    it('should query token balance for account', async () => {
      const input: QueryDaoInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        query_type: 'token_balance',
        account: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        response_format: ResponseFormat.JSON
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.balance).toBeDefined();
    });

    it('should query voting power for account', async () => {
      const input: QueryDaoInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        query_type: 'voting_power',
        account: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        response_format: ResponseFormat.JSON
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.voting_power).toBeDefined();
    });
  });

  describe('casper_build_dao_propose', () => {
    beforeEach(() => {
      registerBuildDaoProposeTool(server, client);
    });

    it('should build DAO propose transaction with mint_tokens action', async () => {
      const input: BuildDaoProposeInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        from_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        description: 'Mint 1000 tokens for community rewards',
        action_type: 'mint_tokens',
        action_params: {
          recipient: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef02',
          amount: '1000'
        }
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.type).toBe('dao_propose');
      expect(result.structuredContent.proposer).toBe(input.from_public_key);
      expect(result.structuredContent.description).toBe(input.description);
      expect(result.structuredContent.action_type).toBe('mint_tokens');
      expect(result.structuredContent.requires_signature).toBe(true);
      expect(result.structuredContent.unsigned_deploy).toBeDefined();
    });

    it('should build DAO propose transaction with treasury_transfer action', async () => {
      const input: BuildDaoProposeInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        from_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        description: 'Transfer 500 tokens from treasury',
        action_type: 'treasury_transfer',
        action_params: {
          recipient: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef02',
          amount: '500'
        }
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.type).toBe('dao_propose');
      expect(result.structuredContent.action_type).toBe('treasury_transfer');
    });

    it('should include header in unsigned deploy', async () => {
      const input: BuildDaoProposeInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        from_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        description: 'Update voting period to 7 days',
        action_type: 'update_voting_period',
        action_params: {
          new_period: '604800000'
        }
      };

      const result = await mockToolHandler(input);

      const deploy = result.structuredContent.unsigned_deploy;
      expect(deploy.caller).toBe(input.from_public_key);
      expect(deploy.chain_name).toBe('casper-test');
      expect(deploy.payment_amount).toBeDefined();
    });
  });

  describe('casper_build_dao_vote', () => {
    beforeEach(() => {
      registerBuildDaoVoteTool(server, client);
    });

    it('should build DAO vote transaction with yes vote', async () => {
      const input: BuildDaoVoteInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        from_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        proposal_id: '1',
        support: true,
        amount: '100'
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.type).toBe('dao_vote');
      expect(result.structuredContent.voter).toBe(input.from_public_key);
      expect(result.structuredContent.proposal_id).toBe(input.proposal_id);
      expect(result.structuredContent.support).toBe(true);
      expect(result.structuredContent.amount).toBe(input.amount);
      expect(result.structuredContent.requires_signature).toBe(true);
      expect(result.structuredContent.unsigned_deploy).toBeDefined();
    });

    it('should build DAO vote transaction with no vote', async () => {
      const input: BuildDaoVoteInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        from_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        proposal_id: '2',
        support: false,
        amount: '50'
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.type).toBe('dao_vote');
      expect(result.structuredContent.support).toBe(false);
    });

    it('should include header and payment in unsigned deploy', async () => {
      const input: BuildDaoVoteInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        from_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        proposal_id: '3',
        support: true,
        amount: '200'
      };

      const result = await mockToolHandler(input);

      const deploy = result.structuredContent.unsigned_deploy;
      expect(deploy.caller).toBe(input.from_public_key);
      expect(deploy.chain_name).toBe('casper-test');
      expect(deploy.payment_amount).toBeDefined();
    });
  });

  describe('casper_build_dao_execute', () => {
    beforeEach(() => {
      registerBuildDaoExecuteTool(server, client);
    });

    it('should build DAO execute transaction', async () => {
      const input: BuildDaoExecuteInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        from_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        proposal_id: '1'
      };

      const result = await mockToolHandler(input);

      expect(result).toBeDefined();
      expect(result.structuredContent).toBeDefined();
      expect(result.structuredContent.type).toBe('dao_execute');
      expect(result.structuredContent.executor).toBe(input.from_public_key);
      expect(result.structuredContent.proposal_id).toBe(input.proposal_id);
      expect(result.structuredContent.requires_signature).toBe(true);
    });

    it('should include header and payment in unsigned deploy', async () => {
      const input: BuildDaoExecuteInput = {
        contract_address: 'hash-0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',
        from_public_key: '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef01',
        proposal_id: '5'
      };

      const result = await mockToolHandler(input);

      const deploy = result.structuredContent.unsigned_deploy;
      expect(deploy.caller).toBe(input.from_public_key);
      expect(deploy.payment_amount).toBeDefined();
    });
  });
});
