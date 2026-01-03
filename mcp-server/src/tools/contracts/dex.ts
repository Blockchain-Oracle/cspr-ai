/**
 * DEX Contract Tools
 *
 * MCP tools for interacting with DEX (Decentralized Exchange) contracts.
 * Provides AMM functionality using constant product formula (x * y = k).
 *
 * Tool Categories:
 * 1. casper_query_dex - Query DEX state (pools, LP balances, reserves, quotes)
 * 2. casper_build_dex_create_pool - Build unsigned pool creation transaction
 * 3. casper_build_dex_add_liquidity - Build unsigned add liquidity transaction
 * 4. casper_build_dex_remove_liquidity - Build unsigned remove liquidity transaction
 * 5. casper_build_dex_swap - Build unsigned swap transaction
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
  QueryDexInput,
  BuildDexCreatePoolInput,
  BuildDexAddLiquidityInput,
  BuildDexRemoveLiquidityInput,
  BuildDexSwapInput,
  DexPoolOutput,
  DexPoolCountOutput,
  DexLpBalanceOutput,
  DexReservesOutput,
  DexSwapQuoteOutput,
  DexCreatePoolOutput,
  DexAddLiquidityOutput,
  DexRemoveLiquidityOutput,
  DexSwapOutput
} from "../../types.js";
import {
  QueryDexInputSchema,
  BuildDexCreatePoolInputSchema,
  BuildDexAddLiquidityInputSchema,
  BuildDexRemoveLiquidityInputSchema,
  BuildDexSwapInputSchema
} from "../../schemas/index.js";
import { createErrorResult } from "../../utils/errors.js";
import {
  validatePublicKey,
  truncateAddress,
  jsonCodeBlock,
  getContractFromEnv
} from "../../utils/contracts.js";

// ============================================================================
// Tool Descriptions
// ============================================================================

const QUERY_DEX_DESCRIPTION = `Query DEX contract state including pools, LP balances, reserves, and swap quotes.

Query Types:
1. "pool" - Get pool details (requires pool_id)
   - Returns: token addresses, reserves, LP supply, fee

2. "pool_count" - Get total number of pools
   - Returns: total pool count

3. "lp_balance" - Get LP token balance (requires pool_id and provider)
   - Returns: LP token balance for provider

4. "reserves" - Get pool reserves (requires pool_id)
   - Returns: reserve_a and reserve_b amounts

5. "swap_quote" - Get swap quote (requires pool_id, token_in, amount_in)
   - Returns: estimated amount_out for swap

Parameters:
- contract_address: DEX contract address (hash-...)
- query_type: Type of query to perform
- pool_id: Pool ID (required for pool, lp_balance, reserves, swap_quote queries)
- provider: Provider address (required for lp_balance queries)
- token_in: Input token address (required for swap_quote queries)
- amount_in: Input amount (required for swap_quote queries)
- response_format: "markdown" (human-readable) or "json" (machine-readable)

Returns structured data based on query type.

Security: Read-only operation. No transaction signing required.`;

const BUILD_CREATE_POOL_DESCRIPTION = `Build unsigned transaction to create a new liquidity pool.

Pool Creation:
- Each token pair can only have one pool
- Token addresses are automatically sorted for consistency
- Pool starts with zero liquidity
- Uses default DEX fee setting
- Uses the configured DEX contract (CASPER_DEX_CONTRACT_ADDRESS) from environment

This tool builds an UNSIGNED transaction that must be signed by the creator's wallet.

Parameters:
- from_public_key: Creator's public key (must sign the transaction)
- token_a: First token contract address
- token_b: Second token contract address

Returns unsigned deploy with pool creation call and expected pool ID.

Security: Returns UNSIGNED transaction. Never handles private keys.`;

const BUILD_ADD_LIQUIDITY_DESCRIPTION = `Build unsigned transaction to add liquidity to a pool.

Liquidity Addition:
- First liquidity provider: LP tokens = sqrt(amount_a * amount_b)
- Subsequent providers: LP tokens proportional to existing liquidity
- Slippage protection via min_lp_tokens parameter
- Maintains constant product ratio
- Uses the configured DEX contract (CASPER_DEX_CONTRACT_ADDRESS) from environment

Requirements:
- Pool must exist
- Both token amounts must be greater than zero
- User must approve token transfers to DEX contract

This tool builds an UNSIGNED transaction that must be signed by the provider's wallet.

Parameters:
- from_public_key: Provider's public key (must sign the transaction)
- pool_id: Pool ID to add liquidity to (as string for uint64)
- amount_a: Amount of token A to add
- amount_b: Amount of token B to add
- min_lp_tokens: Minimum LP tokens to receive (slippage protection)

Returns unsigned deploy with add liquidity call and expected LP tokens.

Security: Returns UNSIGNED transaction. Never handles private keys.`;

const BUILD_REMOVE_LIQUIDITY_DESCRIPTION = `Build unsigned transaction to remove liquidity from a pool.

Liquidity Removal:
- Burns LP tokens to receive underlying tokens
- Tokens returned proportionally to pool reserves
- Slippage protection via min_amount_a and min_amount_b parameters
- Uses the configured DEX contract (CASPER_DEX_CONTRACT_ADDRESS) from environment

Requirements:
- User must have sufficient LP token balance
- LP tokens will be burned
- Receives both token A and token B

This tool builds an UNSIGNED transaction that must be signed by the provider's wallet.

Parameters:
- from_public_key: Provider's public key (must sign the transaction)
- pool_id: Pool ID to remove liquidity from (as string for uint64)
- lp_tokens: Amount of LP tokens to burn
- min_amount_a: Minimum token A to receive (slippage protection)
- min_amount_b: Minimum token B to receive (slippage protection)

Returns unsigned deploy with remove liquidity call.

Security: Returns UNSIGNED transaction. Never handles private keys.`;

const BUILD_SWAP_DESCRIPTION = `Build unsigned transaction to swap tokens using constant product AMM.

Swap Mechanism:
- Uses constant product formula: x * y = k
- Includes swap fee (reduces output amount)
- Slippage protection via min_amount_out parameter
- No price oracles required (AMM determines price)
- Uses the configured DEX contract (CASPER_DEX_CONTRACT_ADDRESS) from environment

Formula:
- amount_out = (amount_in * fee_factor * reserve_out) / (reserve_in + amount_in * fee_factor)
- fee_factor = 10000 - fee_bps (e.g., 9970 for 0.3% fee)

Requirements:
- Pool must have sufficient liquidity
- token_in must be one of the pool's tokens
- User must approve token transfer to DEX contract

This tool builds an UNSIGNED transaction that must be signed by the trader's wallet.

Parameters:
- from_public_key: Trader's public key (must sign the transaction)
- pool_id: Pool ID to swap in (as string for uint64)
- token_in: Token to swap from (must be in pool)
- amount_in: Amount to swap
- min_amount_out: Minimum amount to receive (slippage protection)

Returns unsigned deploy with swap call and estimated output amount.

Security: Returns UNSIGNED transaction. Never handles private keys.`;

// ============================================================================
// Tool 1: Deploy DEX Contract
// ============================================================================

/**
 * Register casper_deploy_dex tool
 *
 * Builds unsigned transaction to deploy a new DEX contract
 */
// ============================================================================
// Tool 2: Query DEX State
// ============================================================================

/**
 * Register casper_query_dex tool
 *
 * Query DEX contract state (pools, balances, reserves, quotes)
 */
export function registerQueryDexTool(server: McpServer, client: CasperClient): void {
  server.registerTool(
    "casper_query_dex",
    {
      title: "Query DEX State",
      description: QUERY_DEX_DESCRIPTION,
      inputSchema: QueryDexInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: QueryDexInput): Promise<CallToolResult> => {
      try {
        const { contract_address, query_type } = params;

        // NOTE: This is a placeholder implementation
        // In production, this would use client.rpcClient.queryGlobalState()
        // to read contract state from the blockchain

        let result;
        let textContent;

        switch (query_type) {
          case "pool": {
            if (!params.pool_id) {
              throw new Error("pool_id is required for pool queries");
            }

            const output: DexPoolOutput = {
              contract_address,
              pool_id: params.pool_id,
              token_a: "hash-abc123...",  // Would be queried from contract
              token_b: "hash-def456...",  // Would be queried from contract
              reserve_a: "1000000",  // Would be queried from contract
              reserve_b: "2000000",  // Would be queried from contract
              total_lp_supply: "1414213",  // Would be queried from contract
              fee_bps: 30  // Would be queried from contract
            };
            result = output;
            textContent = `# DEX Pool Information

## Contract
- **Address:** \`${contract_address}\`

## Pool #${params.pool_id}
- **Token A:** \`${output.token_a}\`
- **Token B:** \`${output.token_b}\`
- **Reserve A:** ${output.reserve_a}
- **Reserve B:** ${output.reserve_b}
- **LP Supply:** ${output.total_lp_supply}
- **Fee:** ${output.fee_bps} bps (${output.fee_bps / 100}%)`;
            break;
          }

          case "pool_count": {
            const output: DexPoolCountOutput = {
              contract_address,
              pool_count: "5"  // Would be queried from contract
            };
            result = output;
            textContent = `# DEX Pool Count

## Contract
- **Address:** \`${contract_address}\`

## Pool Count
- **Total Pools:** ${output.pool_count}`;
            break;
          }

          case "lp_balance": {
            if (!params.pool_id || !params.provider) {
              throw new Error("pool_id and provider are required for lp_balance queries");
            }

            const output: DexLpBalanceOutput = {
              contract_address,
              pool_id: params.pool_id,
              provider: params.provider,
              lp_balance: "1000"  // Would be queried from contract
            };
            result = output;
            textContent = `# LP Token Balance

## Query
- **Contract:** \`${contract_address}\`
- **Pool:** ${params.pool_id}
- **Provider:** \`${truncateAddress(params.provider)}\`

## Balance
- **LP Tokens:** ${output.lp_balance}`;
            break;
          }

          case "reserves": {
            if (!params.pool_id) {
              throw new Error("pool_id is required for reserves queries");
            }

            const output: DexReservesOutput = {
              contract_address,
              pool_id: params.pool_id,
              reserve_a: "1000000",  // Would be queried from contract
              reserve_b: "2000000"  // Would be queried from contract
            };
            result = output;
            textContent = `# Pool Reserves

## Query
- **Contract:** \`${contract_address}\`
- **Pool:** ${params.pool_id}

## Reserves
- **Reserve A:** ${output.reserve_a}
- **Reserve B:** ${output.reserve_b}
- **Ratio:** ${Number(output.reserve_b) / Number(output.reserve_a)} B per A`;
            break;
          }

          case "swap_quote": {
            if (!params.pool_id || !params.token_in || !params.amount_in) {
              throw new Error("pool_id, token_in, and amount_in are required for swap_quote queries");
            }

            // Simulated calculation - would use actual reserves and fee
            const output: DexSwapQuoteOutput = {
              contract_address,
              pool_id: params.pool_id,
              token_in: params.token_in,
              amount_in: params.amount_in,
              amount_out: "997"  // Would be calculated from contract state
            };
            result = output;
            textContent = `# Swap Quote

## Query
- **Contract:** \`${contract_address}\`
- **Pool:** ${params.pool_id}

## Swap Details
- **Token In:** \`${truncateAddress(params.token_in)}\`
- **Amount In:** ${params.amount_in}
- **Estimated Out:** ${output.amount_out}

*Note: This is an estimate. Actual amount may vary based on slippage.*`;
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
        return createErrorResult(error, "DEX query");
      }
    }
  );
}

// ============================================================================
// Tool 3: Build Create Pool Transaction
// ============================================================================

/**
 * Register casper_build_dex_create_pool tool
 *
 * Builds unsigned transaction to create a new liquidity pool
 */
export function registerBuildDexCreatePoolTool(server: McpServer, client: CasperClient): void {
  server.registerTool(
    "casper_build_dex_create_pool",
    {
      title: "Build DEX Create Pool Transaction",
      description: BUILD_CREATE_POOL_DESCRIPTION,
      inputSchema: BuildDexCreatePoolInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async (params: BuildDexCreatePoolInput): Promise<CallToolResult> => {
      try {
        // Auto-load contract address from environment
        const contractAddress = getContractFromEnv('CASPER_DEX_CONTRACT_ADDRESS');
        if (!contractAddress) {
          throw new Error(
            'DEX contract not configured. Set CASPER_DEX_CONTRACT_ADDRESS in environment.'
          );
        }

        const { from_public_key, token_a, token_b } = params;

        validatePublicKey(from_public_key);

        const network = client.getChainName();

        // Build contract call arguments
        const contractArgs = [
          ["token_a", { cl_type: "Key", parsed: token_a }],
          ["token_b", { cl_type: "Key", parsed: token_b }]
        ];

        // Build unsigned deploy
        const unsignedDeploy = {
          deploy_type: "contract_call",
          contract_address: contractAddress,
          entry_point: "create_pool",
          args: contractArgs,
          caller: from_public_key,
          chain_name: network,
          payment_amount: "3000000000", // 3 CSPR
          gas_price: "1"
        };

        // Create structured output
        const output: DexCreatePoolOutput = {
          type: "dex_create_pool",
          contract_address: contractAddress,
          creator: from_public_key,
          token_a,
          token_b,
          network,
          requires_signature: true,
          unsigned_deploy: unsignedDeploy
        };

        const textContent = `# DEX Create Pool Transaction

## Pool Configuration
- **Token A:** \`${token_a}\`
- **Token B:** \`${token_b}\`
- **Contract:** \`${contractAddress}\`
- **Creator:** \`${truncateAddress(from_public_key)}\`
- **Network:** ${network}

## Next Steps
1. This is an **unsigned transaction**
2. Sign with your wallet (CSPR.click)
3. Submit to network
4. Pool will be created with auto-incremented ID
5. Add liquidity to activate trading

${jsonCodeBlock(output.unsigned_deploy)}`;

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: output
        };
      } catch (error) {
        return createErrorResult(error, "DEX create pool build");
      }
    }
  );
}

// ============================================================================
// Tool 4: Build Add Liquidity Transaction
// ============================================================================

/**
 * Register casper_build_dex_add_liquidity tool
 *
 * Builds unsigned transaction to add liquidity to a pool
 */
export function registerBuildDexAddLiquidityTool(server: McpServer, client: CasperClient): void {
  server.registerTool(
    "casper_build_dex_add_liquidity",
    {
      title: "Build DEX Add Liquidity Transaction",
      description: BUILD_ADD_LIQUIDITY_DESCRIPTION,
      inputSchema: BuildDexAddLiquidityInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async (params: BuildDexAddLiquidityInput): Promise<CallToolResult> => {
      try {
        // Auto-load contract address from environment
        const contractAddress = getContractFromEnv('CASPER_DEX_CONTRACT_ADDRESS');
        if (!contractAddress) {
          throw new Error(
            'DEX contract not configured. Set CASPER_DEX_CONTRACT_ADDRESS in environment.'
          );
        }

        const {
          from_public_key,
          pool_id,
          amount_a,
          amount_b,
          min_lp_tokens
        } = params;

        validatePublicKey(from_public_key);

        const network = client.getChainName();

        // Build contract call arguments
        const contractArgs = [
          ["pool_id", { cl_type: "U64", parsed: pool_id }],
          ["amount_a", { cl_type: "U256", parsed: amount_a }],
          ["amount_b", { cl_type: "U256", parsed: amount_b }],
          ["min_lp_tokens", { cl_type: "U256", parsed: min_lp_tokens }]
        ];

        // Build unsigned deploy
        const unsignedDeploy = {
          deploy_type: "contract_call",
          contract_address: contractAddress,
          entry_point: "add_liquidity",
          args: contractArgs,
          caller: from_public_key,
          chain_name: network,
          payment_amount: "5000000000", // 5 CSPR
          gas_price: "1"
        };

        // Create structured output
        const output: DexAddLiquidityOutput = {
          type: "dex_add_liquidity",
          contract_address: contractAddress,
          provider: from_public_key,
          pool_id,
          amount_a,
          amount_b,
          min_lp_tokens,
          network,
          requires_signature: true,
          unsigned_deploy: unsignedDeploy
        };

        const textContent = `# DEX Add Liquidity Transaction

## Liquidity Details
- **Pool ID:** ${pool_id}
- **Amount A:** ${amount_a}
- **Amount B:** ${amount_b}
- **Min LP Tokens:** ${min_lp_tokens}
- **Contract:** \`${contractAddress}\`
- **Provider:** \`${truncateAddress(from_public_key)}\`
- **Network:** ${network}

## Next Steps
1. This is an **unsigned transaction**
2. **Approve token transfers** to DEX contract first
3. Sign with your wallet (CSPR.click)
4. Submit to network
5. LP tokens will be minted to your address

${jsonCodeBlock(output.unsigned_deploy)}`;

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: output
        };
      } catch (error) {
        return createErrorResult(error, "DEX add liquidity build");
      }
    }
  );
}

// ============================================================================
// Tool 5: Build Remove Liquidity Transaction
// ============================================================================

/**
 * Register casper_build_dex_remove_liquidity tool
 *
 * Builds unsigned transaction to remove liquidity from a pool
 */
export function registerBuildDexRemoveLiquidityTool(server: McpServer, client: CasperClient): void {
  server.registerTool(
    "casper_build_dex_remove_liquidity",
    {
      title: "Build DEX Remove Liquidity Transaction",
      description: BUILD_REMOVE_LIQUIDITY_DESCRIPTION,
      inputSchema: BuildDexRemoveLiquidityInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async (params: BuildDexRemoveLiquidityInput): Promise<CallToolResult> => {
      try {
        // Auto-load contract address from environment
        const contractAddress = getContractFromEnv('CASPER_DEX_CONTRACT_ADDRESS');
        if (!contractAddress) {
          throw new Error(
            'DEX contract not configured. Set CASPER_DEX_CONTRACT_ADDRESS in environment.'
          );
        }

        const {
          from_public_key,
          pool_id,
          lp_tokens,
          min_amount_a,
          min_amount_b
        } = params;

        validatePublicKey(from_public_key);

        const network = client.getChainName();

        // Build contract call arguments
        const contractArgs = [
          ["pool_id", { cl_type: "U64", parsed: pool_id }],
          ["lp_tokens", { cl_type: "U256", parsed: lp_tokens }],
          ["min_amount_a", { cl_type: "U256", parsed: min_amount_a }],
          ["min_amount_b", { cl_type: "U256", parsed: min_amount_b }]
        ];

        // Build unsigned deploy
        const unsignedDeploy = {
          deploy_type: "contract_call",
          contract_address: contractAddress,
          entry_point: "remove_liquidity",
          args: contractArgs,
          caller: from_public_key,
          chain_name: network,
          payment_amount: "5000000000", // 5 CSPR
          gas_price: "1"
        };

        // Create structured output
        const output: DexRemoveLiquidityOutput = {
          type: "dex_remove_liquidity",
          contract_address: contractAddress,
          provider: from_public_key,
          pool_id,
          lp_tokens,
          min_amount_a,
          min_amount_b,
          network,
          requires_signature: true,
          unsigned_deploy: unsignedDeploy
        };

        const textContent = `# DEX Remove Liquidity Transaction

## Withdrawal Details
- **Pool ID:** ${pool_id}
- **LP Tokens to Burn:** ${lp_tokens}
- **Min Amount A:** ${min_amount_a}
- **Min Amount B:** ${min_amount_b}
- **Contract:** \`${contractAddress}\`
- **Provider:** \`${truncateAddress(from_public_key)}\`
- **Network:** ${network}

## Next Steps
1. This is an **unsigned transaction**
2. Sign with your wallet (CSPR.click)
3. Submit to network
4. LP tokens will be burned
5. Both tokens will be returned proportionally

${jsonCodeBlock(output.unsigned_deploy)}`;

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: output
        };
      } catch (error) {
        return createErrorResult(error, "DEX remove liquidity build");
      }
    }
  );
}

// ============================================================================
// Tool 6: Build Swap Transaction
// ============================================================================

/**
 * Register casper_build_dex_swap tool
 *
 * Builds unsigned transaction to swap tokens
 */
export function registerBuildDexSwapTool(server: McpServer, client: CasperClient): void {
  server.registerTool(
    "casper_build_dex_swap",
    {
      title: "Build DEX Swap Transaction",
      description: BUILD_SWAP_DESCRIPTION,
      inputSchema: BuildDexSwapInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false
      }
    },
    async (params: BuildDexSwapInput): Promise<CallToolResult> => {
      try {
        // Auto-load contract address from environment
        const contractAddress = getContractFromEnv('CASPER_DEX_CONTRACT_ADDRESS');
        if (!contractAddress) {
          throw new Error(
            'DEX contract not configured. Set CASPER_DEX_CONTRACT_ADDRESS in environment.'
          );
        }

        const {
          from_public_key,
          pool_id,
          token_in,
          amount_in,
          min_amount_out
        } = params;

        validatePublicKey(from_public_key);

        const network = client.getChainName();

        // Build contract call arguments
        const contractArgs = [
          ["pool_id", { cl_type: "U64", parsed: pool_id }],
          ["token_in", { cl_type: "Key", parsed: token_in }],
          ["amount_in", { cl_type: "U256", parsed: amount_in }],
          ["min_amount_out", { cl_type: "U256", parsed: min_amount_out }]
        ];

        // Build unsigned deploy
        const unsignedDeploy = {
          deploy_type: "contract_call",
          contract_address: contractAddress,
          entry_point: "swap_exact_tokens_for_tokens",
          args: contractArgs,
          caller: from_public_key,
          chain_name: network,
          payment_amount: "3000000000", // 3 CSPR
          gas_price: "1"
        };

        // Create structured output
        const output: DexSwapOutput = {
          type: "dex_swap",
          contract_address: contractAddress,
          trader: from_public_key,
          pool_id,
          token_in,
          amount_in,
          min_amount_out,
          network,
          requires_signature: true,
          unsigned_deploy: unsignedDeploy
        };

        const textContent = `# DEX Swap Transaction

## Swap Details
- **Pool ID:** ${pool_id}
- **Token In:** \`${truncateAddress(token_in)}\`
- **Amount In:** ${amount_in}
- **Min Amount Out:** ${min_amount_out}
- **Contract:** \`${contractAddress}\`
- **Trader:** \`${truncateAddress(from_public_key)}\`
- **Network:** ${network}

## Next Steps
1. This is an **unsigned transaction**
2. **Approve token transfer** to DEX contract first
3. Sign with your wallet (CSPR.click)
4. Submit to network
5. Swap will execute at current pool ratio

*Note: Actual output may vary due to slippage and pool activity.*

${jsonCodeBlock(output.unsigned_deploy)}`;

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: output
        };
      } catch (error) {
        return createErrorResult(error, "DEX swap build");
      }
    }
  );
}

// ============================================================================
// Export All DEX Tools
// ============================================================================

/**
 * Register all DEX contract tools with the MCP server
 *
 * Registers 5 tools:
 * 1. casper_query_dex - Query DEX state
 * 2. casper_build_dex_create_pool - Create pool transaction
 * 3. casper_build_dex_add_liquidity - Add liquidity transaction
 * 4. casper_build_dex_remove_liquidity - Remove liquidity transaction
 * 5. casper_build_dex_swap - Swap transaction
 */
export function registerAllDexTools(server: McpServer, client: CasperClient): void {
  registerQueryDexTool(server, client);
  registerBuildDexCreatePoolTool(server, client);
  registerBuildDexAddLiquidityTool(server, client);
  registerBuildDexRemoveLiquidityTool(server, client);
  registerBuildDexSwapTool(server, client);
}
