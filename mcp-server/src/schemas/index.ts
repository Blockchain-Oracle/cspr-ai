/**
 * Zod validation schemas for Casper MCP Server tools
 *
 * All input schemas are defined here for reuse across tools
 * and type inference.
 */

import { z } from "zod";
import { ResponseFormat, DEFAULT_LIMIT, MAX_LIMIT } from "../constants.js";

// ============ Common Schemas ============

/**
 * Casper public key schema
 * Validates Ed25519 (01...) or Secp256k1 (02...) public keys
 */
export const PublicKeySchema = z.string()
  .min(66, "Public key must be at least 66 characters (prefix + 64 hex)")
  .max(68, "Public key must be at most 68 characters")
  .regex(
    /^(01[a-fA-F0-9]{64}|02[a-fA-F0-9]{66})$/,
    "Invalid Casper public key format. Must be Ed25519 (01 + 64 hex chars = 66 total) or Secp256k1 (02 + 66 hex chars = 68 total)"
  )
  .describe("Casper public key (e.g., '01abc123...' for Ed25519, '02abc123...' for Secp256k1)");

/**
 * Response format schema for all tools
 */
export const ResponseFormatSchema = z.nativeEnum(ResponseFormat)
  .default(ResponseFormat.MARKDOWN)
  .describe("Output format: 'markdown' for human-readable or 'json' for machine-readable");

/**
 * Deploy hash schema
 */
export const DeployHashSchema = z.string()
  .length(64, "Deploy hash must be exactly 64 hex characters")
  .regex(/^[a-fA-F0-9]{64}$/, "Deploy hash must be 64 hex characters")
  .describe("The deploy hash to query (64 hex characters)");

// ============ Tool Input Schemas ============

/**
 * Input schema for casper_get_balance
 */
export const GetBalanceInputSchema = z.object({
  public_key: PublicKeySchema,
  response_format: ResponseFormatSchema
}).strict();

/**
 * Input schema for casper_get_validators
 */
export const GetValidatorsInputSchema = z.object({
  limit: z.number()
    .int()
    .min(1)
    .max(MAX_LIMIT)
    .default(DEFAULT_LIMIT)
    .describe("Maximum number of validators to return"),
  offset: z.number()
    .int()
    .min(0)
    .default(0)
    .describe("Number of validators to skip for pagination"),
  response_format: ResponseFormatSchema
}).strict();

/**
 * Input schema for casper_get_staking_info
 */
export const GetStakingInfoInputSchema = z.object({
  public_key: PublicKeySchema,
  response_format: ResponseFormatSchema
}).strict();

/**
 * Input schema for casper_get_deploy_status
 */
export const GetDeployStatusInputSchema = z.object({
  deploy_hash: DeployHashSchema,
  response_format: ResponseFormatSchema
}).strict();

/**
 * Input schema for casper_build_transfer
 */
export const TransferCsprInputSchema = z.object({
  from_public_key: PublicKeySchema.describe("Sender's public key"),
  to_public_key: PublicKeySchema.describe("Recipient's public key"),
  amount_cspr: z.number()
    .positive("Amount must be positive")
    .describe("Amount to transfer in CSPR (e.g., 100.5)")
}).strict();

/**
 * Input schema for casper_build_delegation
 */
export const DelegateStakeInputSchema = z.object({
  delegator_public_key: PublicKeySchema.describe("Delegator's public key"),
  validator_public_key: PublicKeySchema.describe("Validator's public key to delegate to"),
  amount_cspr: z.number()
    .positive("Amount must be positive")
    .min(500, "Minimum delegation is 500 CSPR")
    .describe("Amount to delegate in CSPR (minimum 500)")
}).strict();

// ============ Contract Schemas ============

/**
 * Casper contract address schema (hash format)
 */
export const ContractAddressSchema = z.string()
  .regex(
    /^hash-[a-fA-F0-9]{64}$/,
    "Invalid contract address format. Must be 'hash-' followed by 64 hex characters"
  )
  .describe("Casper contract address (e.g., 'hash-abc123...')");

/**
 * U256 amount schema (as string to preserve precision)
 */
export const U256StringSchema = z.string()
  .regex(/^\d+$/, "Amount must be a valid unsigned integer string")
  .describe("Amount as string (to preserve precision for large numbers)");

/**
 * Input schema for casper_deploy_token
 */
export const DeployTokenInputSchema = z.object({
  deployer_public_key: PublicKeySchema.describe("Deployer's public key"),
  name: z.string()
    .min(1, "Token name cannot be empty")
    .max(100, "Token name must be 100 characters or less")
    .describe("Token name (e.g., 'My Token')"),
  symbol: z.string()
    .min(1, "Token symbol cannot be empty")
    .max(10, "Token symbol must be 10 characters or less")
    .describe("Token symbol (e.g., 'MTK')"),
  decimals: z.number()
    .int()
    .min(0)
    .max(18)
    .describe("Token decimals (typically 8 or 18)"),
  initial_supply: U256StringSchema.describe("Initial token supply as string"),
  enable_minting: z.boolean()
    .describe("Enable minting and burning functionality")
}).strict();

/**
 * Input schema for casper_query_token
 */
export const QueryTokenInputSchema = z.object({
  contract_address: ContractAddressSchema,
  query_type: z.enum(["balance", "supply", "metadata", "allowance"])
    .describe("Type of query to perform"),
  owner: PublicKeySchema
    .optional()
    .describe("Owner address (required for balance and allowance queries)"),
  spender: PublicKeySchema
    .optional()
    .describe("Spender address (required for allowance queries)"),
  response_format: ResponseFormatSchema
}).strict();

/**
 * Input schema for casper_build_token_transfer
 */
export const BuildTokenTransferInputSchema = z.object({
  from_public_key: PublicKeySchema.describe("Sender's public key"),
  recipient: PublicKeySchema.describe("Recipient's address"),
  amount: U256StringSchema.describe("Amount to transfer as string")
}).strict();

/**
 * Input schema for casper_build_token_mint
 */
export const BuildTokenMintInputSchema = z.object({
  from_public_key: PublicKeySchema.describe("Minter's public key (must have minter role)"),
  recipient: PublicKeySchema.describe("Recipient's address"),
  amount: U256StringSchema.describe("Amount to mint as string")
}).strict();

/**
 * Input schema for casper_build_token_burn
 */
export const BuildTokenBurnInputSchema = z.object({
  from_public_key: PublicKeySchema.describe("Burner's public key"),
  amount: U256StringSchema.describe("Amount to burn as string")
}).strict();

// ============ NFT Contract Schemas ============

/**
 * Input schema for casper_deploy_nft
 */
export const DeployNftInputSchema = z.object({
  deployer_public_key: PublicKeySchema.describe("Deployer's public key"),
  name: z.string()
    .min(1, "Collection name cannot be empty")
    .max(100, "Collection name must be 100 characters or less")
    .describe("NFT collection name (e.g., 'My NFT Collection')"),
  symbol: z.string()
    .min(1, "Collection symbol cannot be empty")
    .max(10, "Collection symbol must be 10 characters or less")
    .describe("NFT collection symbol (e.g., 'MNFT')"),
  base_uri: z.string()
    .url("Base URI must be a valid URL")
    .describe("Base URI for token metadata (e.g., 'https://api.example.com/metadata/')"),
  max_supply: U256StringSchema.describe("Maximum supply (0 = unlimited)"),
  minting_mode: z.enum(["restricted", "public"])
    .describe("Minting mode: 'restricted' (only authorized minters) or 'public' (anyone can mint)")
}).strict();

/**
 * Input schema for casper_query_nft
 */
export const QueryNftInputSchema = z.object({
  contract_address: ContractAddressSchema,
  query_type: z.enum(["owner", "metadata", "balance", "collection_info", "token_uri", "approved"])
    .describe("Type of query to perform"),
  token_id: U256StringSchema
    .optional()
    .describe("Token ID (required for owner, metadata, token_uri, approved queries)"),
  owner: PublicKeySchema
    .optional()
    .describe("Owner address (required for balance queries)"),
  response_format: ResponseFormatSchema
}).strict();

/**
 * Input schema for casper_build_nft_mint
 */
export const BuildNftMintInputSchema = z.object({
  from_public_key: PublicKeySchema.describe("Minter's public key"),
  to: PublicKeySchema.describe("Recipient's address"),
  token_name: z.string()
    .min(1, "Token name cannot be empty")
    .max(100, "Token name must be 100 characters or less")
    .describe("Individual NFT name"),
  token_uri: z.string()
    .optional()
    .describe("Custom token URI (optional, uses auto-generated URI if not provided)")
}).strict();

/**
 * Input schema for casper_build_nft_transfer
 */
export const BuildNftTransferInputSchema = z.object({
  from_public_key: PublicKeySchema.describe("Current owner's public key"),
  from: PublicKeySchema.describe("Current owner's address"),
  to: PublicKeySchema.describe("Recipient's address"),
  token_id: U256StringSchema.describe("Token ID to transfer")
}).strict();

/**
 * Input schema for casper_build_nft_burn
 */
export const BuildNftBurnInputSchema = z.object({
  from_public_key: PublicKeySchema.describe("Burner's public key (must be owner)"),
  token_id: U256StringSchema.describe("Token ID to burn")
}).strict();

// ============ DAO Contract Schemas ============

/**
 * Input schema for casper_deploy_dao
 */
export const DeployDaoInputSchema = z.object({
  deployer_public_key: PublicKeySchema.describe("Deployer's public key"),
  token_name: z.string()
    .min(1, "Governance token name cannot be empty")
    .max(100, "Token name must be 100 characters or less")
    .describe("Governance token name (e.g., 'DAO Token')"),
  token_symbol: z.string()
    .min(1, "Token symbol cannot be empty")
    .max(10, "Token symbol must be 10 characters or less")
    .describe("Governance token symbol (e.g., 'DAO')"),
  initial_supply: U256StringSchema.describe("Initial governance token supply"),
  voting_period_ms: z.string()
    .regex(/^\d+$/, "Voting period must be a valid unsigned integer string")
    .describe("Voting period in milliseconds (as string for uint64)"),
  proposal_threshold: U256StringSchema.describe("Minimum tokens required to create proposal"),
  quorum: U256StringSchema.describe("Minimum votes required for proposal validity")
}).strict();

/**
 * Input schema for casper_query_dao
 */
export const QueryDaoInputSchema = z.object({
  contract_address: ContractAddressSchema,
  query_type: z.enum(["proposal", "vote", "config", "token_balance", "voting_power"])
    .describe("Type of query to perform"),
  proposal_id: z.string()
    .regex(/^\d+$/)
    .optional()
    .describe("Proposal ID (required for proposal and vote queries, as string for uint64)"),
  voter: PublicKeySchema
    .optional()
    .describe("Voter address (required for vote queries)"),
  account: PublicKeySchema
    .optional()
    .describe("Account address (required for token_balance and voting_power queries)"),
  response_format: ResponseFormatSchema
}).strict();

/**
 * Input schema for casper_build_dao_propose
 */
export const BuildDaoProposeInputSchema = z.object({
  from_public_key: PublicKeySchema.describe("Proposer's public key"),
  description: z.string()
    .min(1, "Proposal description cannot be empty")
    .max(500, "Description must be 500 characters or less")
    .describe("Proposal description"),
  action_type: z.enum(["mint_tokens", "treasury_transfer", "update_voting_period", "custom"])
    .describe("Type of action for this proposal"),
  action_params: z.object({
    recipient: PublicKeySchema.optional(),
    amount: U256StringSchema.optional(),
    new_period: z.string().regex(/^\d+$/).optional(),
    custom_description: z.string().optional()
  })
    .describe("Action-specific parameters")
}).strict();

/**
 * Input schema for casper_build_dao_vote
 */
export const BuildDaoVoteInputSchema = z.object({
  from_public_key: PublicKeySchema.describe("Voter's public key"),
  proposal_id: z.string()
    .regex(/^\d+$/, "Proposal ID must be a valid unsigned integer string")
    .describe("Proposal ID to vote on (as string for uint64)"),
  support: z.boolean()
    .describe("Vote yes (true) or no (false)"),
  amount: U256StringSchema.describe("Voting power to allocate")
}).strict();

/**
 * Input schema for casper_build_dao_execute
 */
export const BuildDaoExecuteInputSchema = z.object({
  from_public_key: PublicKeySchema.describe("Executor's public key"),
  proposal_id: z.string()
    .regex(/^\d+$/, "Proposal ID must be a valid unsigned integer string")
    .describe("Proposal ID to execute (as string for uint64)")
}).strict();

// ============ DEX Contract Schemas ============

/**
 * Input schema for casper_deploy_dex
 */
export const DeployDexInputSchema = z.object({
  deployer_public_key: PublicKeySchema.describe("Deployer's public key"),
  default_fee_bps: z.number()
    .int()
    .min(0)
    .max(1000)
    .describe("Default fee in basis points (0-1000, max 10%)")
}).strict();

/**
 * Input schema for casper_query_dex
 */
export const QueryDexInputSchema = z.object({
  contract_address: ContractAddressSchema,
  query_type: z.enum(["pool", "pool_count", "lp_balance", "reserves", "swap_quote"])
    .describe("Type of query to perform"),
  pool_id: z.string()
    .regex(/^\d+$/)
    .optional()
    .describe("Pool ID (required for pool, lp_balance, reserves, swap_quote queries, as string for uint64)"),
  provider: PublicKeySchema
    .optional()
    .describe("Provider address (required for lp_balance queries)"),
  token_in: PublicKeySchema
    .optional()
    .describe("Input token address (required for swap_quote queries)"),
  amount_in: U256StringSchema
    .optional()
    .describe("Input amount (required for swap_quote queries)"),
  response_format: ResponseFormatSchema
}).strict();

/**
 * Input schema for casper_build_dex_create_pool
 */
export const BuildDexCreatePoolInputSchema = z.object({
  from_public_key: PublicKeySchema.describe("Creator's public key"),
  token_a: ContractAddressSchema.describe("First token address"),
  token_b: ContractAddressSchema.describe("Second token address")
}).strict();

/**
 * Input schema for casper_build_dex_add_liquidity
 */
export const BuildDexAddLiquidityInputSchema = z.object({
  from_public_key: PublicKeySchema.describe("Liquidity provider's public key"),
  pool_id: z.string()
    .regex(/^\d+$/, "Pool ID must be a valid unsigned integer string")
    .describe("Pool ID (as string for uint64)"),
  amount_a: U256StringSchema.describe("Amount of token A"),
  amount_b: U256StringSchema.describe("Amount of token B"),
  min_lp_tokens: U256StringSchema.describe("Minimum LP tokens to receive (slippage protection)")
}).strict();

/**
 * Input schema for casper_build_dex_remove_liquidity
 */
export const BuildDexRemoveLiquidityInputSchema = z.object({
  from_public_key: PublicKeySchema.describe("Liquidity provider's public key"),
  pool_id: z.string()
    .regex(/^\d+$/, "Pool ID must be a valid unsigned integer string")
    .describe("Pool ID (as string for uint64)"),
  lp_tokens: U256StringSchema.describe("LP tokens to burn"),
  min_amount_a: U256StringSchema.describe("Minimum token A to receive (slippage protection)"),
  min_amount_b: U256StringSchema.describe("Minimum token B to receive (slippage protection)")
}).strict();

/**
 * Input schema for casper_build_dex_swap
 */
export const BuildDexSwapInputSchema = z.object({
  from_public_key: PublicKeySchema.describe("Trader's public key"),
  pool_id: z.string()
    .regex(/^\d+$/, "Pool ID must be a valid unsigned integer string")
    .describe("Pool ID (as string for uint64)"),
  token_in: ContractAddressSchema.describe("Token to swap from"),
  amount_in: U256StringSchema.describe("Amount to swap"),
  min_amount_out: U256StringSchema.describe("Minimum amount to receive (slippage protection)")
}).strict();
