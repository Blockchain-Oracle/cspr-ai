/**
 * Type definitions for the Casper MCP Server
 */

import { z } from "zod";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import {
  GetBalanceInputSchema,
  GetValidatorsInputSchema,
  GetStakingInfoInputSchema,
  GetDeployStatusInputSchema,
  TransferCsprInputSchema,
  DelegateStakeInputSchema,
  DeployTokenInputSchema,
  QueryTokenInputSchema,
  BuildTokenTransferInputSchema,
  BuildTokenMintInputSchema,
  BuildTokenBurnInputSchema,
  DeployNftInputSchema,
  QueryNftInputSchema,
  BuildNftMintInputSchema,
  BuildNftTransferInputSchema,
  BuildNftBurnInputSchema,
  DeployDaoInputSchema,
  QueryDaoInputSchema,
  BuildDaoProposeInputSchema,
  BuildDaoVoteInputSchema,
  BuildDaoExecuteInputSchema,
  DeployDexInputSchema,
  QueryDexInputSchema,
  BuildDexCreatePoolInputSchema,
  BuildDexAddLiquidityInputSchema,
  BuildDexRemoveLiquidityInputSchema,
  BuildDexSwapInputSchema
} from "./schemas/index.js";

// Input types inferred from Zod schemas
export type GetBalanceInput = z.infer<typeof GetBalanceInputSchema>;
export type GetValidatorsInput = z.infer<typeof GetValidatorsInputSchema>;
export type GetStakingInfoInput = z.infer<typeof GetStakingInfoInputSchema>;
export type GetDeployStatusInput = z.infer<typeof GetDeployStatusInputSchema>;
export type TransferCsprInput = z.infer<typeof TransferCsprInputSchema>;
export type DelegateStakeInput = z.infer<typeof DelegateStakeInputSchema>;

// Contract input types
export type DeployTokenInput = z.infer<typeof DeployTokenInputSchema>;
export type QueryTokenInput = z.infer<typeof QueryTokenInputSchema>;
export type BuildTokenTransferInput = z.infer<typeof BuildTokenTransferInputSchema>;
export type BuildTokenMintInput = z.infer<typeof BuildTokenMintInputSchema>;
export type BuildTokenBurnInput = z.infer<typeof BuildTokenBurnInputSchema>;

// NFT input types
export type DeployNftInput = z.infer<typeof DeployNftInputSchema>;
export type QueryNftInput = z.infer<typeof QueryNftInputSchema>;
export type BuildNftMintInput = z.infer<typeof BuildNftMintInputSchema>;
export type BuildNftTransferInput = z.infer<typeof BuildNftTransferInputSchema>;
export type BuildNftBurnInput = z.infer<typeof BuildNftBurnInputSchema>;

// DAO input types
export type DeployDaoInput = z.infer<typeof DeployDaoInputSchema>;
export type QueryDaoInput = z.infer<typeof QueryDaoInputSchema>;
export type BuildDaoProposeInput = z.infer<typeof BuildDaoProposeInputSchema>;
export type BuildDaoVoteInput = z.infer<typeof BuildDaoVoteInputSchema>;
export type BuildDaoExecuteInput = z.infer<typeof BuildDaoExecuteInputSchema>;

// DEX input types
export type DeployDexInput = z.infer<typeof DeployDexInputSchema>;
export type QueryDexInput = z.infer<typeof QueryDexInputSchema>;
export type BuildDexCreatePoolInput = z.infer<typeof BuildDexCreatePoolInputSchema>;
export type BuildDexAddLiquidityInput = z.infer<typeof BuildDexAddLiquidityInputSchema>;
export type BuildDexRemoveLiquidityInput = z.infer<typeof BuildDexRemoveLiquidityInputSchema>;
export type BuildDexSwapInput = z.infer<typeof BuildDexSwapInputSchema>;

// Re-export SDK type for tool handlers
export type { CallToolResult };

// Output types for structured responses (using index signatures for SDK compatibility)
export interface BalanceOutput {
  [key: string]: unknown;
  public_key: string;
  balance_cspr: string;
  balance_motes: string;
  network: string;
}

export interface ValidatorOutput {
  [key: string]: unknown;
  public_key: string;
  total_stake_cspr: string;
  delegation_rate: number;
  delegator_count: number;
}

export interface ValidatorsOutput {
  [key: string]: unknown;
  validators: ValidatorOutput[];
  total_count: number;
  offset: number;
  count: number;
  has_more: boolean;
  next_offset?: number;
}

export interface DelegationOutput {
  [key: string]: unknown;
  validator_public_key: string;
  staked_amount_cspr: string;
}

export interface StakingInfoOutput {
  [key: string]: unknown;
  delegator: string;
  delegations: DelegationOutput[];
  total_staked_cspr: string;
}

export interface DeployStatusOutput {
  [key: string]: unknown;
  deploy_hash: string;
  status: "success" | "failed" | "pending";
  block_hash: string | null;
  cost_cspr: string;
  timestamp: string | null;
  error_message: string | null;
}

export interface TransferOutput {
  [key: string]: unknown;
  type: "transfer";
  from: string;
  to: string;
  amount_cspr: number;
  amount_motes: string;
  network: string;
  requires_signature: true;
  unsigned_deploy: object;
}

export interface DelegationBuildOutput {
  [key: string]: unknown;
  type: "delegate";
  delegator: string;
  validator: string;
  amount_cspr: number;
  amount_motes: string;
  network: string;
  requires_signature: true;
  unsigned_deploy: object;
}

// Contract output types

export interface TokenDeployOutput {
  [key: string]: unknown;
  type: "token_deploy";
  deployer: string;
  token_name: string;
  token_symbol: string;
  decimals: number;
  initial_supply: string;
  enable_minting: boolean;
  network: string;
  requires_signature: true;
  unsigned_deploy: object;
}

export interface TokenMetadataOutput {
  [key: string]: unknown;
  contract_address: string;
  name: string;
  symbol: string;
  decimals: number;
  total_supply: string;
}

export interface TokenBalanceOutput {
  [key: string]: unknown;
  contract_address: string;
  owner: string;
  balance: string;
}

export interface TokenAllowanceOutput {
  [key: string]: unknown;
  contract_address: string;
  owner: string;
  spender: string;
  allowance: string;
}

export interface TokenTransferOutput {
  [key: string]: unknown;
  type: "token_transfer";
  contract_address: string;
  from: string;
  to: string;
  amount: string;
  network: string;
  requires_signature: true;
  unsigned_deploy: object;
}

export interface TokenMintOutput {
  [key: string]: unknown;
  type: "token_mint";
  contract_address: string;
  minter: string;
  recipient: string;
  amount: string;
  network: string;
  requires_signature: true;
  unsigned_deploy: object;
}

export interface TokenBurnOutput {
  [key: string]: unknown;
  type: "token_burn";
  contract_address: string;
  burner: string;
  amount: string;
  network: string;
  requires_signature: true;
  unsigned_deploy: object;
}

// NFT output types

export interface NftDeployOutput {
  [key: string]: unknown;
  type: "nft_deploy";
  deployer: string;
  collection_name: string;
  collection_symbol: string;
  base_uri: string;
  max_supply: string;
  minting_mode: "restricted" | "public";
  network: string;
  requires_signature: true;
  unsigned_deploy: object;
}

export interface NftCollectionInfoOutput {
  [key: string]: unknown;
  contract_address: string;
  name: string;
  symbol: string;
  base_uri: string;
  max_supply: string;
  total_supply: string;
  minting_mode: string;
}

export interface NftOwnerOutput {
  [key: string]: unknown;
  contract_address: string;
  token_id: string;
  owner: string;
}

export interface NftBalanceOutput {
  [key: string]: unknown;
  contract_address: string;
  owner: string;
  balance: string;
}

export interface NftTokenUriOutput {
  [key: string]: unknown;
  contract_address: string;
  token_id: string;
  token_uri: string;
}

export interface NftMetadataOutput {
  [key: string]: unknown;
  contract_address: string;
  token_id: string;
  name: string;
  token_uri: string;
  owner: string;
}

export interface NftMintOutput {
  [key: string]: unknown;
  type: "nft_mint";
  contract_address: string;
  minter: string;
  recipient: string;
  token_name: string;
  token_uri: string | null;
  network: string;
  requires_signature: true;
  unsigned_deploy: object;
}

export interface NftTransferOutput {
  [key: string]: unknown;
  type: "nft_transfer";
  contract_address: string;
  from: string;
  to: string;
  token_id: string;
  network: string;
  requires_signature: true;
  unsigned_deploy: object;
}

export interface NftBurnOutput {
  [key: string]: unknown;
  type: "nft_burn";
  contract_address: string;
  burner: string;
  token_id: string;
  network: string;
  requires_signature: true;
  unsigned_deploy: object;
}

// DAO output types

export interface DaoDeployOutput {
  [key: string]: unknown;
  type: "dao_deploy";
  deployer: string;
  token_name: string;
  token_symbol: string;
  initial_supply: string;
  voting_period_ms: string;
  proposal_threshold: string;
  quorum: string;
  network: string;
  requires_signature: true;
  unsigned_deploy: object;
}

export interface DaoConfigOutput {
  [key: string]: unknown;
  contract_address: string;
  voting_period_ms: string;
  proposal_threshold: string;
  quorum: string;
}

export interface DaoProposalOutput {
  [key: string]: unknown;
  contract_address: string;
  proposal_id: string;
  description: string;
  proposer: string;
  status: string;
  yes_votes: string;
  no_votes: string;
  created_at: string;
  voting_ends_at: string;
}

export interface DaoVoteOutput {
  [key: string]: unknown;
  contract_address: string;
  proposal_id: string;
  voter: string;
  support: boolean;
  amount: string;
}

export interface DaoTokenBalanceOutput {
  [key: string]: unknown;
  contract_address: string;
  account: string;
  balance: string;
}

export interface DaoVotingPowerOutput {
  [key: string]: unknown;
  contract_address: string;
  account: string;
  voting_power: string;
}

export interface DaoProposeOutput {
  [key: string]: unknown;
  type: "dao_propose";
  contract_address: string;
  proposer: string;
  description: string;
  action_type: string;
  action_params: object;
  network: string;
  requires_signature: true;
  unsigned_deploy: object;
}

export interface DaoVoteTransactionOutput {
  [key: string]: unknown;
  type: "dao_vote";
  contract_address: string;
  voter: string;
  proposal_id: string;
  support: boolean;
  amount: string;
  network: string;
  requires_signature: true;
  unsigned_deploy: object;
}

export interface DaoExecuteOutput {
  [key: string]: unknown;
  type: "dao_execute";
  contract_address: string;
  executor: string;
  proposal_id: string;
  network: string;
  requires_signature: true;
  unsigned_deploy: object;
}

// DEX output types

export interface DexDeployOutput {
  [key: string]: unknown;
  type: "dex_deploy";
  deployer: string;
  default_fee_bps: number;
  network: string;
  requires_signature: true;
  unsigned_deploy: object;
}

export interface DexPoolOutput {
  [key: string]: unknown;
  contract_address: string;
  pool_id: string;
  token_a: string;
  token_b: string;
  reserve_a: string;
  reserve_b: string;
  total_lp_supply: string;
  fee_bps: number;
}

export interface DexPoolCountOutput {
  [key: string]: unknown;
  contract_address: string;
  pool_count: string;
}

export interface DexLpBalanceOutput {
  [key: string]: unknown;
  contract_address: string;
  pool_id: string;
  provider: string;
  lp_balance: string;
}

export interface DexReservesOutput {
  [key: string]: unknown;
  contract_address: string;
  pool_id: string;
  reserve_a: string;
  reserve_b: string;
}

export interface DexSwapQuoteOutput {
  [key: string]: unknown;
  contract_address: string;
  pool_id: string;
  token_in: string;
  amount_in: string;
  amount_out: string;
}

export interface DexCreatePoolOutput {
  [key: string]: unknown;
  type: "dex_create_pool";
  contract_address: string;
  creator: string;
  token_a: string;
  token_b: string;
  network: string;
  requires_signature: true;
  unsigned_deploy: object;
}

export interface DexAddLiquidityOutput {
  [key: string]: unknown;
  type: "dex_add_liquidity";
  contract_address: string;
  provider: string;
  pool_id: string;
  amount_a: string;
  amount_b: string;
  min_lp_tokens: string;
  network: string;
  requires_signature: true;
  unsigned_deploy: object;
}

export interface DexRemoveLiquidityOutput {
  [key: string]: unknown;
  type: "dex_remove_liquidity";
  contract_address: string;
  provider: string;
  pool_id: string;
  lp_tokens: string;
  min_amount_a: string;
  min_amount_b: string;
  network: string;
  requires_signature: true;
  unsigned_deploy: object;
}

export interface DexSwapOutput {
  [key: string]: unknown;
  type: "dex_swap";
  contract_address: string;
  trader: string;
  pool_id: string;
  token_in: string;
  amount_in: string;
  min_amount_out: string;
  network: string;
  requires_signature: true;
  unsigned_deploy: object;
}
