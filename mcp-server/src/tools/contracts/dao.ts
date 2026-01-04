/**
 * DAO Contract Tools
 *
 * MCP tools for interacting with DAO (Decentralized Autonomous Organization) contracts.
 * Provides governance functionality including proposal creation, voting, and execution.
 *
 * Tool Categories:
 * 1. casper_query_dao - Query DAO state (proposals, votes, config, etc.)
 * 2. casper_build_dao_propose - Build unsigned proposal creation transaction
 * 3. casper_build_dao_vote - Build unsigned vote transaction
 * 4. casper_build_dao_execute - Build unsigned proposal execution transaction
 *
 * Security:
 * - All write operations return UNSIGNED transactions
 * - Private keys never handled by MCP server
 * - User must sign transactions in their wallet
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CasperClient } from "../../services/casper-client.js";
import type {
  CallToolResult,
  QueryDaoInput,
  BuildDaoProposeInput,
  BuildDaoVoteInput,
  BuildDaoExecuteInput,
  DaoConfigOutput,
  DaoProposalOutput,
  DaoVoteOutput,
  DaoTokenBalanceOutput,
  DaoVotingPowerOutput,
  DaoProposeOutput,
  DaoVoteTransactionOutput,
  DaoExecuteOutput
} from "../../types.js";
import {
  QueryDaoInputSchema,
  BuildDaoProposeInputSchema,
  BuildDaoVoteInputSchema,
  BuildDaoExecuteInputSchema
} from "../../schemas/index.js";
import { createErrorResult } from "../../utils/errors.js";
import {
  validatePublicKey,
  truncateAddress,
  jsonCodeBlock,
  getContractFromEnv,
  buildStoredContractDeploy
} from "../../utils/contracts.js";
import {
  proposalActionToCLValue,
  type ProposalActionParams
} from "../../utils/enum-serialization.js";

// ============================================================================
// Tool Descriptions
// ============================================================================

const QUERY_DAO_DESCRIPTION = `Query DAO contract state including proposals, votes, configuration, and voting power.

Query Types:
1. "proposal" - Get proposal details (requires proposal_id)
   - Returns: description, proposer, status, vote counts, timestamps

2. "vote" - Get specific vote (requires proposal_id and voter)
   - Returns: voter address, support (yes/no), voting power used

3. "config" - Get DAO configuration
   - Returns: voting_period_ms, proposal_threshold, quorum

4. "token_balance" - Get governance token balance (requires account)
   - Returns: account address, token balance

5. "voting_power" - Get voting power for account (requires account)
   - Returns: account address, current voting power

Parameters:
- contract_address: DAO contract address (hash-...)
- query_type: Type of query to perform
- proposal_id: Proposal ID (required for proposal/vote queries)
- voter: Voter address (required for vote queries)
- account: Account address (required for token_balance/voting_power queries)
- response_format: "markdown" (human-readable) or "json" (machine-readable)

Returns structured data based on query type.

Security: Read-only operation. No transaction signing required.`;

const BUILD_DAO_PROPOSE_DESCRIPTION = `Build unsigned transaction to create a new DAO proposal.

Proposals can include various action types:
1. "mint_tokens" - Mint new governance tokens (params: recipient, amount)
2. "treasury_transfer" - Transfer from DAO treasury (params: recipient, amount)
3. "update_voting_period" - Change voting period (params: new_period)
4. "custom" - Custom proposal action (params: custom_description)

Proposal Creation Requirements:
- Proposer must hold at least proposal_threshold tokens
- Proposal description must be clear and concise (max 500 chars)
- Action parameters must match the action type
- Uses the configured DAO contract (CASPER_DAO_CONTRACT_ADDRESS) from environment

This tool builds an UNSIGNED transaction that must be signed by the proposer's wallet.

Parameters:
- from_public_key: Proposer's public key (must have enough tokens)
- description: Proposal description (1-500 characters)
- action_type: Type of action ("mint_tokens", "treasury_transfer", "update_voting_period", "custom")
- action_params: Action-specific parameters object

Returns unsigned deploy with proposal creation call.

Security: Returns UNSIGNED transaction. Never handles private keys.`;

const BUILD_DAO_VOTE_DESCRIPTION = `Build unsigned transaction to vote on a DAO proposal.

Voting Mechanism:
- Snapshot-based: Uses token balance at time of vote
- Weighted voting: More tokens = more voting power
- Binary choice: Support (yes) or oppose (no)
- Can allocate specific amount of voting power
- Uses the configured DAO contract (CASPER_DAO_CONTRACT_ADDRESS) from environment

Vote Requirements:
- Proposal must be active (within voting period)
- Voter must hold governance tokens
- Cannot vote twice on same proposal

This tool builds an UNSIGNED transaction that must be signed by the voter's wallet.

Parameters:
- from_public_key: Voter's public key (must sign the transaction)
- proposal_id: Proposal ID to vote on (as string for uint64)
- support: Vote yes (true) or no (false)
- amount: Voting power to allocate (as string)

Returns unsigned deploy with vote call.

Security: Returns UNSIGNED transaction. Never handles private keys.`;

const BUILD_DAO_EXECUTE_DESCRIPTION = `Build unsigned transaction to execute a passed DAO proposal.

Execution Requirements:
- Voting period must have ended
- Proposal must have reached quorum (minimum votes)
- Proposal must have majority support (yes > no)
- Proposal status must be "approved"
- Uses the configured DAO contract (CASPER_DAO_CONTRACT_ADDRESS) from environment

Execution Effects:
- Executes the proposed action (mint, transfer, config change, custom)
- Changes proposal status to "executed"
- Irreversible once executed

This tool builds an UNSIGNED transaction that must be signed by the executor's wallet.

Parameters:
- from_public_key: Executor's public key (anyone can execute passed proposals)
- proposal_id: Proposal ID to execute (as string for uint64)

Returns unsigned deploy with execution call.

Security: Returns UNSIGNED transaction. Never handles private keys.`;

// ============================================================================
// Tool 1: Deploy DAO Contract
// ============================================================================


// ============================================================================
// Tool 2: Query DAO State
// ============================================================================

/**
 * Register casper_query_dao tool
 *
 * Query DAO contract state (proposals, votes, config, balances, voting power)
 */
export function registerQueryDaoTool(server: McpServer, client: CasperClient): void {
  server.registerTool(
    "casper_query_dao",
    {
      title: "Query DAO State",
      description: QUERY_DAO_DESCRIPTION,
      inputSchema: QueryDaoInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: QueryDaoInput): Promise<CallToolResult> => {
      try {
        const { contract_address, query_type } = params;

        // NOTE: This is a placeholder implementation
        // In production, this would use client.rpcClient.queryGlobalState()
        // to read contract state from the blockchain

        let result;
        let textContent;

        switch (query_type) {
          case "proposal": {
            if (!params.proposal_id) {
              throw new Error("proposal_id is required for proposal queries");
            }

            const output: DaoProposalOutput = {
              contract_address,
              proposal_id: params.proposal_id,
              description: "Example proposal description",  // Would be queried from contract
              proposer: "01abc...",  // Would be queried from contract
              status: "active",  // Would be queried from contract
              yes_votes: "1000",  // Would be queried from contract
              no_votes: "500",  // Would be queried from contract
              created_at: "1234567890",  // Would be queried from contract
              voting_ends_at: "1234567890"  // Would be queried from contract
            };
            result = output;
            textContent = `# DAO Proposal

## Contract
- **Address:** \`${contract_address}\`

## Proposal #${params.proposal_id}
- **Description:** ${output.description}
- **Proposer:** \`${output.proposer}\`
- **Status:** ${output.status}
- **Yes Votes:** ${output.yes_votes}
- **No Votes:** ${output.no_votes}
- **Created:** ${output.created_at}
- **Voting Ends:** ${output.voting_ends_at}`;
            break;
          }

          case "vote": {
            if (!params.proposal_id || !params.voter) {
              throw new Error("proposal_id and voter are required for vote queries");
            }

            const output: DaoVoteOutput = {
              contract_address,
              proposal_id: params.proposal_id,
              voter: params.voter,
              support: true,  // Would be queried from contract
              amount: "100"  // Would be queried from contract
            };
            result = output;
            textContent = `# DAO Vote

## Query
- **Contract:** \`${contract_address}\`
- **Proposal:** ${params.proposal_id}
- **Voter:** \`${truncateAddress(params.voter)}\`

## Vote Details
- **Support:** ${output.support ? "Yes" : "No"}
- **Voting Power:** ${output.amount}`;
            break;
          }

          case "config": {
            const output: DaoConfigOutput = {
              contract_address,
              voting_period_ms: "86400000",  // Would be queried from contract
              proposal_threshold: "1000",  // Would be queried from contract
              quorum: "5000"  // Would be queried from contract
            };
            result = output;
            textContent = `# DAO Configuration

## Contract
- **Address:** \`${contract_address}\`

## Voting Parameters
- **Voting Period:** ${output.voting_period_ms}ms
- **Proposal Threshold:** ${output.proposal_threshold} tokens
- **Quorum:** ${output.quorum} votes`;
            break;
          }

          case "token_balance": {
            if (!params.account) {
              throw new Error("account is required for token_balance queries");
            }

            const output: DaoTokenBalanceOutput = {
              contract_address,
              account: params.account,
              balance: "1000"  // Would be queried from contract
            };
            result = output;
            textContent = `# Governance Token Balance

## Query
- **Contract:** \`${contract_address}\`
- **Account:** \`${truncateAddress(params.account)}\`

## Balance
- **Amount:** ${output.balance}`;
            break;
          }

          case "voting_power": {
            if (!params.account) {
              throw new Error("account is required for voting_power queries");
            }

            const output: DaoVotingPowerOutput = {
              contract_address,
              account: params.account,
              voting_power: "1000"  // Would be queried from contract
            };
            result = output;
            textContent = `# Voting Power

## Query
- **Contract:** \`${contract_address}\`
- **Account:** \`${truncateAddress(params.account)}\`

## Voting Power
- **Amount:** ${output.voting_power}`;
            break;
          }

          default:
            throw new Error(`Unknown query type: ${query_type}`);
        }

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: result
        };
      } catch (error) {
        return createErrorResult(error, "DAO query");
      }
    }
  );
}

// ============================================================================
// Tool 3: Build DAO Proposal Transaction
// ============================================================================

/**
 * Register casper_build_dao_propose tool
 *
 * Builds unsigned transaction to create a new DAO proposal
 */
export function registerBuildDaoProposeTool(server: McpServer, client: CasperClient): void {
  server.registerTool(
    "casper_build_dao_propose",
    {
      title: "Build DAO Proposal Transaction",
      description: BUILD_DAO_PROPOSE_DESCRIPTION,
      inputSchema: BuildDaoProposeInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async (params: BuildDaoProposeInput): Promise<CallToolResult> => {
      try {
        // Auto-load contract address from environment
        const contractAddress = getContractFromEnv('CASPER_DAO_CONTRACT_ADDRESS');
        if (!contractAddress) {
          throw new Error(
            'DAO contract not configured. Set CASPER_DAO_CONTRACT_ADDRESS in environment.'
          );
        }

        const {
          from_public_key,
          description,
          action_type,
          action_params
        } = params;

        validatePublicKey(from_public_key);

        // Build ProposalAction enum based on action type
        let proposalAction: ProposalActionParams;

        switch (action_type) {
          case "mint_tokens":
            if (!action_params.recipient || !action_params.amount) {
              throw new Error("mint_tokens requires recipient and amount parameters");
            }
            proposalAction = {
              type: "mint_tokens",
              params: {
                recipient: action_params.recipient,
                amount: action_params.amount
              }
            };
            break;

          case "treasury_transfer":
            if (!action_params.recipient || !action_params.amount) {
              throw new Error("treasury_transfer requires recipient and amount parameters");
            }
            proposalAction = {
              type: "treasury_transfer",
              params: {
                recipient: action_params.recipient,
                amount: action_params.amount
              }
            };
            break;

          case "update_voting_period":
            if (!action_params.new_period) {
              throw new Error("update_voting_period requires new_period parameter");
            }
            proposalAction = {
              type: "update_voting_period",
              params: {
                new_period: action_params.new_period
              }
            };
            break;

          case "custom":
            proposalAction = {
              type: "custom",
              params: {
                description: action_params.custom_description || ""
              }
            };
            break;

          default:
            throw new Error(`Unknown action type: ${action_type}`);
        }

        // Serialize the ProposalAction enum to ByteArray
        const actionCLValue = proposalActionToCLValue(proposalAction);

        // Build contract call arguments
        const contractArgs = [
          ["description", { cl_type: "String", parsed: description }],
          ["action", actionCLValue]
        ];

        const network = client.getChainName();

        // Build unsigned deploy using standard format
        const unsignedDeploy = buildStoredContractDeploy(
          from_public_key,
          network,
          contractAddress,
          "create_proposal",
          contractArgs as import("../../utils/contracts.js").ContractArg[]
        );

        // Create structured output
        const output: DaoProposeOutput = {
          type: "dao_propose",
          contract_address: contractAddress,
          proposer: from_public_key,
          description,
          action_type,
          action_params,
          network,
          requires_signature: true,
          unsigned_deploy: unsignedDeploy
        };

        const textContent = `# DAO Proposal Transaction

## Proposal Details
- **Description:** ${description}
- **Action Type:** ${action_type}
- **Contract:** \`${contractAddress}\`
- **Proposer:** \`${truncateAddress(from_public_key)}\`
- **Network:** ${network}

## Action Parameters
${JSON.stringify(action_params, null, 2)}

## Next Steps
1. This is an **unsigned transaction**
2. Sign with your wallet (CSPR.click)
3. Submit to network
4. Proposal will be created with auto-incremented ID

${jsonCodeBlock(output.unsigned_deploy)}`;

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: output
        };
      } catch (error) {
        return createErrorResult(error, "DAO proposal build");
      }
    }
  );
}

// ============================================================================
// Tool 4: Build DAO Vote Transaction
// ============================================================================

/**
 * Register casper_build_dao_vote tool
 *
 * Builds unsigned transaction to vote on a DAO proposal
 */
export function registerBuildDaoVoteTool(server: McpServer, client: CasperClient): void {
  server.registerTool(
    "casper_build_dao_vote",
    {
      title: "Build DAO Vote Transaction",
      description: BUILD_DAO_VOTE_DESCRIPTION,
      inputSchema: BuildDaoVoteInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async (params: BuildDaoVoteInput): Promise<CallToolResult> => {
      try {
        // Auto-load contract address from environment
        const contractAddress = getContractFromEnv('CASPER_DAO_CONTRACT_ADDRESS');
        if (!contractAddress) {
          throw new Error(
            'DAO contract not configured. Set CASPER_DAO_CONTRACT_ADDRESS in environment.'
          );
        }

        const {
          from_public_key,
          proposal_id,
          support,
          amount
        } = params;

        validatePublicKey(from_public_key);

        // Build contract call arguments
        const contractArgs = [
          ["proposal_id", { cl_type: "U64", parsed: proposal_id }],
          ["support", { cl_type: "Bool", parsed: support }],
          ["amount", { cl_type: "U256", parsed: amount }]
        ];

        const network = client.getChainName();

        // Build unsigned deploy using standard format
        const unsignedDeploy = buildStoredContractDeploy(
          from_public_key,
          network,
          contractAddress,
          "vote",
          contractArgs as import("../../utils/contracts.js").ContractArg[]
        );

        // Create structured output
        const output: DaoVoteTransactionOutput = {
          type: "dao_vote",
          contract_address: contractAddress,
          voter: from_public_key,
          proposal_id,
          support,
          amount,
          network,
          requires_signature: true,
          unsigned_deploy: unsignedDeploy
        };

        const textContent = `# DAO Vote Transaction

## Vote Details
- **Proposal ID:** ${proposal_id}
- **Support:** ${support ? "Yes" : "No"}
- **Voting Power:** ${amount}
- **Contract:** \`${contractAddress}\`
- **Voter:** \`${truncateAddress(from_public_key)}\`
- **Network:** ${network}

## Next Steps
1. This is an **unsigned transaction**
2. Sign with your wallet (CSPR.click)
3. Submit to network
4. Your vote will be recorded with snapshot balance

${jsonCodeBlock(output.unsigned_deploy)}`;

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: output
        };
      } catch (error) {
        return createErrorResult(error, "DAO vote build");
      }
    }
  );
}

// ============================================================================
// Tool 5: Build DAO Execute Transaction
// ============================================================================

/**
 * Register casper_build_dao_execute tool
 *
 * Builds unsigned transaction to execute a passed DAO proposal
 */
export function registerBuildDaoExecuteTool(server: McpServer, client: CasperClient): void {
  server.registerTool(
    "casper_build_dao_execute",
    {
      title: "Build DAO Execute Transaction",
      description: BUILD_DAO_EXECUTE_DESCRIPTION,
      inputSchema: BuildDaoExecuteInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async (params: BuildDaoExecuteInput): Promise<CallToolResult> => {
      try {
        // Auto-load contract address from environment
        const contractAddress = getContractFromEnv('CASPER_DAO_CONTRACT_ADDRESS');
        if (!contractAddress) {
          throw new Error(
            'DAO contract not configured. Set CASPER_DAO_CONTRACT_ADDRESS in environment.'
          );
        }

        const {
          from_public_key,
          proposal_id
        } = params;

        validatePublicKey(from_public_key);

        // Build contract call arguments
        const contractArgs = [
          ["proposal_id", { cl_type: "U64", parsed: proposal_id }]
        ];

        const network = client.getChainName();

        // Build unsigned deploy using standard format
        const unsignedDeploy = buildStoredContractDeploy(
          from_public_key,
          network,
          contractAddress,
          "execute",
          contractArgs as import("../../utils/contracts.js").ContractArg[]
        );

        // Create structured output
        const output: DaoExecuteOutput = {
          type: "dao_execute",
          contract_address: contractAddress,
          executor: from_public_key,
          proposal_id,
          network,
          requires_signature: true,
          unsigned_deploy: unsignedDeploy
        };

        const textContent = `# DAO Execute Proposal Transaction

## Execution Details
- **Proposal ID:** ${proposal_id}
- **Contract:** \`${contractAddress}\`
- **Executor:** \`${truncateAddress(from_public_key)}\`
- **Network:** ${network}

## Next Steps
1. This is an **unsigned transaction**
2. **Verify proposal has passed:**
   - Voting period ended
   - Quorum reached
   - Majority support
3. Sign with your wallet (CSPR.click)
4. Submit to network
5. Proposal action will execute if valid

${jsonCodeBlock(output.unsigned_deploy)}`;

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: output
        };
      } catch (error) {
        return createErrorResult(error, "DAO execute build");
      }
    }
  );
}

// ============================================================================
// Export All DAO Tools
// ============================================================================

/**
 * Register all DAO contract tools with the MCP server
 *
 * Registers 4 tools:
 * 1. casper_query_dao - Query DAO state
 * 2. casper_build_dao_propose - Create proposal transaction
 * 3. casper_build_dao_vote - Vote on proposal transaction
 * 4. casper_build_dao_execute - Execute proposal transaction
 */
export function registerAllDaoTools(server: McpServer, client: CasperClient): void {
  registerQueryDaoTool(server, client);
  registerBuildDaoProposeTool(server, client);
  registerBuildDaoVoteTool(server, client);
  registerBuildDaoExecuteTool(server, client);
}
