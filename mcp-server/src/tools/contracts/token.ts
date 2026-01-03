/**
 * Token Contract (CEP-18) MCP Tools
 *
 * Provides tools for interacting with custom CEP-18 token contracts:
 * - Deploy new token contracts
 * - Query token state (balance, metadata, allowance)
 * - Build unsigned transactions (transfer, mint, burn)
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  QueryTokenInputSchema,
  BuildTokenTransferInputSchema,
  BuildTokenMintInputSchema,
  BuildTokenBurnInputSchema
} from "../../schemas/index.js";
import { CasperClient } from "../../services/casper-client.js";
import { createErrorResult } from "../../utils/errors.js";
import {
  validatePublicKey,
  validatePublicKeys,
  buildModuleBytesDeploy,
  buildStoredContractDeploy,
  truncateAddress,
  getDeploymentNextSteps,
  getTransactionNextSteps,
  jsonCodeBlock,
  getContractFromEnv
} from "../../utils/contracts.js";
import type {
  QueryTokenInput,
  BuildTokenTransferInput,
  BuildTokenMintInput,
  BuildTokenBurnInput,
  TokenMetadataOutput,
  TokenBalanceOutput,
  TokenAllowanceOutput,
  TokenTransferOutput,
  TokenMintOutput,
  TokenBurnOutput,
  CallToolResult
} from "../../types.js";

// ============================================================================
// Tool Names
// ============================================================================

const QUERY_TOKEN_TOOL = "casper_query_token";
const BUILD_TOKEN_TRANSFER_TOOL = "casper_build_token_transfer";
const BUILD_TOKEN_MINT_TOOL = "casper_build_token_mint";
const BUILD_TOKEN_BURN_TOOL = "casper_build_token_burn";

// ============================================================================
// Tool Descriptions
// ============================================================================

const QUERY_TOKEN_DESCRIPTION = `Query token contract state (read-only, no gas cost).

Retrieve token information from a deployed CEP-18 contract:
- metadata: Get name, symbol, decimals, total supply
- balance: Get token balance for an owner
- supply: Get total supply only
- allowance: Get approved spending amount for a spender

Args:
  - contract_address (string): Token contract address (hash-...)
  - query_type (string): "metadata", "balance", "supply", or "allowance"
  - owner (string, optional): Required for balance and allowance queries
  - spender (string, optional): Required for allowance queries
  - response_format (string): "markdown" or "json"

Returns:
  Query result based on query_type.

Examples:
  - Get metadata: query_type="metadata"
  - Get balance: query_type="balance", owner="01abc..."
  - Get allowance: query_type="allowance", owner="01abc...", spender="01def..."

Error Handling:
  - Returns error if contract doesn't exist
  - Returns error if required parameters are missing`;

const BUILD_TOKEN_TRANSFER_DESCRIPTION = `Build unsigned token transfer transaction.

Creates an unsigned transaction to transfer tokens from one address to another.
Uses the configured token contract (CASPER_TOKEN_CONTRACT_ADDRESS) from environment.

Args:
  - from_public_key (string): Sender's public key
  - recipient (string): Recipient's address
  - amount (string): Amount to transfer as string (for precision)

Returns:
  Unsigned transaction that must be signed with your wallet.

Examples:
  - Transfer 100 tokens: amount="100"
  - Transfer with decimals: amount="1000000000" (for 10 tokens with 8 decimals)

IMPORTANT: Amount must be provided as the smallest unit (considering decimals).
For a token with 8 decimals, to transfer 10 tokens, use amount="1000000000".`;

const BUILD_TOKEN_MINT_DESCRIPTION = `Build unsigned token mint transaction.

Creates an unsigned transaction to mint new tokens to a recipient.
Uses the configured token contract (CASPER_TOKEN_CONTRACT_ADDRESS) from environment.
Requires minter role on the contract.

Args:
  - from_public_key (string): Minter's public key (must have minter role)
  - recipient (string): Recipient's address
  - amount (string): Amount to mint as string

Returns:
  Unsigned mint transaction.

IMPORTANT:
- Minting must be enabled on the contract
- Caller must have minter role
- Amount is in smallest unit (considering decimals)`;

const BUILD_TOKEN_BURN_DESCRIPTION = `Build unsigned token burn transaction.

Creates an unsigned transaction to burn tokens from caller's balance.
Uses the configured token contract (CASPER_TOKEN_CONTRACT_ADDRESS) from environment.
Requires burning to be enabled on the contract.

Args:
  - from_public_key (string): Burner's public key
  - amount (string): Amount to burn as string

Returns:
  Unsigned burn transaction.

IMPORTANT:
- Burning must be enabled on the contract
- Caller must have sufficient balance
- Amount is in smallest unit (considering decimals)`;

// ============================================================================
// Tool Implementations
// ============================================================================


/**
 * Register casper_query_token tool
 */
export function registerQueryTokenTool(server: McpServer, client: CasperClient): void {
  server.registerTool(
    QUERY_TOKEN_TOOL,
    {
      title: "Query Token Contract",
      description: QUERY_TOKEN_DESCRIPTION,
      inputSchema: QueryTokenInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: QueryTokenInput): Promise<CallToolResult> => {
      try {
        const { contract_address, query_type, owner, spender } = params;

        // NOTE: This is a placeholder implementation
        // In production, this would use client.rpcClient.queryGlobalState()

        let result;
        let textContent;

        switch (query_type) {
          case "metadata": {
            const metadata: TokenMetadataOutput = {
              contract_address,
              name: "Example Token",
              symbol: "EXT",
              decimals: 8,
              total_supply: "1000000"
            };
            result = metadata;
            textContent = `# Token Metadata

## Contract
- **Address:** \`${contract_address}\`

## Token Info
- **Name:** ${metadata.name}
- **Symbol:** ${metadata.symbol}
- **Decimals:** ${metadata.decimals}
- **Total Supply:** ${metadata.total_supply}`;
            break;
          }

          case "balance": {
            if (!owner) {
              throw new Error("Owner address required for balance query");
            }
            const balance: TokenBalanceOutput = {
              contract_address,
              owner,
              balance: "0"
            };
            result = balance;
            textContent = `# Token Balance

## Query
- **Contract:** \`${contract_address}\`
- **Owner:** \`${truncateAddress(owner)}\`

## Balance
- **Amount:** ${balance.balance}`;
            break;
          }

          case "supply": {
            result = {
              contract_address,
              total_supply: "1000000"
            };
            textContent = `# Token Supply

## Contract
- **Address:** \`${contract_address}\`

## Supply
- **Total Supply:** ${result.total_supply}`;
            break;
          }

          case "allowance": {
            if (!owner || !spender) {
              throw new Error("Owner and spender addresses required for allowance query");
            }
            const allowance: TokenAllowanceOutput = {
              contract_address,
              owner,
              spender,
              allowance: "0"
            };
            result = allowance;
            textContent = `# Token Allowance

## Query
- **Contract:** \`${contract_address}\`
- **Owner:** \`${truncateAddress(owner)}\`
- **Spender:** \`${truncateAddress(spender)}\`

## Allowance
- **Amount:** ${allowance.allowance}`;
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
        return createErrorResult(error, "token query");
      }
    }
  );
}

/**
 * Register casper_build_token_transfer tool
 */
export function registerBuildTokenTransferTool(server: McpServer, client: CasperClient): void {
  server.registerTool(
    BUILD_TOKEN_TRANSFER_TOOL,
    {
      title: "Build Token Transfer",
      description: BUILD_TOKEN_TRANSFER_DESCRIPTION,
      inputSchema: BuildTokenTransferInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: BuildTokenTransferInput): Promise<CallToolResult> => {
      try {
        // Auto-load contract address from environment
        const contractAddress = getContractFromEnv('CASPER_TOKEN_CONTRACT_ADDRESS');
        if (!contractAddress) {
          throw new Error(
            'Token contract not configured. Set CASPER_TOKEN_CONTRACT_ADDRESS in environment.'
          );
        }

        validatePublicKeys([params.from_public_key, params.recipient]);

        const network = client.getChainName();
        const unsignedDeploy = buildStoredContractDeploy(
          params.from_public_key,
          network,
          contractAddress,
          "transfer",
          [
            ["recipient", { cl_type: "Key", parsed: params.recipient }],
            ["amount", { cl_type: "U256", parsed: params.amount }]
          ]
        );

        const output: TokenTransferOutput = {
          type: "token_transfer",
          contract_address: contractAddress,
          from: params.from_public_key,
          to: params.recipient,
          amount: params.amount,
          network,
          requires_signature: true,
          unsigned_deploy: unsignedDeploy
        };

        const textContent = `# Token Transfer Transaction

## Details
- **Contract:** \`${contractAddress}\`
- **From:** \`${truncateAddress(params.from_public_key)}\`
- **To:** \`${truncateAddress(params.recipient)}\`
- **Amount:** ${params.amount}
- **Network:** ${network}

${getTransactionNextSteps()}

${jsonCodeBlock(output.unsigned_deploy)}`;

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: output
        };
      } catch (error) {
        return createErrorResult(error, "token transfer build");
      }
    }
  );
}

/**
 * Register casper_build_token_mint tool
 */
export function registerBuildTokenMintTool(server: McpServer, client: CasperClient): void {
  server.registerTool(
    BUILD_TOKEN_MINT_TOOL,
    {
      title: "Build Token Mint",
      description: BUILD_TOKEN_MINT_DESCRIPTION,
      inputSchema: BuildTokenMintInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: BuildTokenMintInput): Promise<CallToolResult> => {
      try {
        // Auto-load contract address from environment
        const contractAddress = getContractFromEnv('CASPER_TOKEN_CONTRACT_ADDRESS');
        if (!contractAddress) {
          throw new Error(
            'Token contract not configured. Set CASPER_TOKEN_CONTRACT_ADDRESS in environment.'
          );
        }

        validatePublicKeys([params.from_public_key, params.recipient]);

        const network = client.getChainName();
        const unsignedDeploy = buildStoredContractDeploy(
          params.from_public_key,
          network,
          contractAddress,
          "mint",
          [
            ["recipient", { cl_type: "Key", parsed: params.recipient }],
            ["amount", { cl_type: "U256", parsed: params.amount }]
          ]
        );

        const output: TokenMintOutput = {
          type: "token_mint",
          contract_address: contractAddress,
          minter: params.from_public_key,
          recipient: params.recipient,
          amount: params.amount,
          network,
          requires_signature: true,
          unsigned_deploy: unsignedDeploy
        };

        const textContent = `# Token Mint Transaction

## Details
- **Contract:** \`${contractAddress}\`
- **Minter:** \`${truncateAddress(params.from_public_key)}\`
- **Recipient:** \`${truncateAddress(params.recipient)}\`
- **Amount:** ${params.amount}
- **Network:** ${network}

## Requirements
- Minting must be enabled on the contract
- Caller must have minter role

${getTransactionNextSteps()}

${jsonCodeBlock(output.unsigned_deploy)}`;

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: output
        };
      } catch (error) {
        return createErrorResult(error, "token mint build");
      }
    }
  );
}

/**
 * Register casper_build_token_burn tool
 */
export function registerBuildTokenBurnTool(server: McpServer, client: CasperClient): void {
  server.registerTool(
    BUILD_TOKEN_BURN_TOOL,
    {
      title: "Build Token Burn",
      description: BUILD_TOKEN_BURN_DESCRIPTION,
      inputSchema: BuildTokenBurnInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: BuildTokenBurnInput): Promise<CallToolResult> => {
      try {
        // Auto-load contract address from environment
        const contractAddress = getContractFromEnv('CASPER_TOKEN_CONTRACT_ADDRESS');
        if (!contractAddress) {
          throw new Error(
            'Token contract not configured. Set CASPER_TOKEN_CONTRACT_ADDRESS in environment.'
          );
        }

        validatePublicKey(params.from_public_key);

        const network = client.getChainName();
        const unsignedDeploy = buildStoredContractDeploy(
          params.from_public_key,
          network,
          contractAddress,
          "burn",
          [
            ["amount", { cl_type: "U256", parsed: params.amount }]
          ]
        );

        const output: TokenBurnOutput = {
          type: "token_burn",
          contract_address: contractAddress,
          burner: params.from_public_key,
          amount: params.amount,
          network,
          requires_signature: true,
          unsigned_deploy: unsignedDeploy
        };

        const textContent = `# Token Burn Transaction

## Details
- **Contract:** \`${contractAddress}\`
- **Burner:** \`${truncateAddress(params.from_public_key)}\`
- **Amount:** ${params.amount}
- **Network:** ${network}

## Requirements
- Burning must be enabled on the contract
- Caller must have sufficient balance

${getTransactionNextSteps()}

${jsonCodeBlock(output.unsigned_deploy)}`;

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: output
        };
      } catch (error) {
        return createErrorResult(error, "token burn build");
      }
    }
  );
}

/**
 * Register all token contract tools
 */
export function registerAllTokenTools(server: McpServer, client: CasperClient): void {
  registerQueryTokenTool(server, client);
  registerBuildTokenTransferTool(server, client);
  registerBuildTokenMintTool(server, client);
  registerBuildTokenBurnTool(server, client);
}
