/**
 * TypeScript Type Definitions for cspr.cloud REST API
 *
 * Generated from official API documentation at https://docs.cspr.cloud
 * Last updated: 2025-12-22
 *
 * All types are derived from actual API responses and documentation.
 * Fields marked with `?` are optional and may not be present in all responses.
 */

// ============================================================================
// Common Types & Enums
// ============================================================================

/**
 * Paginated response wrapper used by all list endpoints
 */
export interface PaginatedResponse<T> {
  /** Total number of items across all pages */
  item_count: number;
  /** Total number of pages */
  page_count: number;
  /** Array of items for current page */
  data: T[];
}

/**
 * Common pagination query parameters
 */
export interface PaginationParams {
  /** Page number (default: 1) */
  page?: number;
  /** Items per page (default: 20, max varies by endpoint) */
  page_size?: number;
}

/**
 * Optional includes for expanding related entities
 */
export interface OptionalIncludes {
  /** Include related entities in response */
  with_amounts_in_currency_id?: number;
  /** Fields to include as comma-separated list */
  fields?: string;
}

// ============================================================================
// Account Entity
// ============================================================================

/**
 * Account entity - represents accounts observed in network activity
 * May not have on-chain balance but can own tokens/NFTs
 */
export interface Account {
  /** Account public key (68 char hex string) - PRIMARY IDENTIFIER */
  public_key: string;
  /** 32-byte hash of public key (64 char hex string) - SECONDARY IDENTIFIER */
  account_hash: string;
  /** Liquid balance in motes */
  balance: string;
  /** Account main purse URef (format: uref-{hash}-007) */
  main_purse_uref: string;
  /** Min total weight for deploys */
  deployment_threshold: number;
  /** Min total weight for key management */
  key_management_threshold: number;
  /** Initial balance at genesis */
  genesis_balance: string;

  // Optional properties
  /** Account auction status */
  auction_status?: "inactive_bidder" | "active_bidder" | "active_validator" | "pending_validator";
  /** Total delegated funds across all validators */
  delegated_balance?: string;
  /** Total staked funds as validator */
  staked_balance?: string;
  /** Undelegating funds (7 era lockdown period) */
  undelegating_balance?: string;
  /** Account info (if provided by owner) */
  account_info?: AccountInfo;
  /** Centralized account info (CSPR.cloud curated) */
  centralized_account_info?: CentralizedAccountInfo;
  /** Primary CSPR.name domain */
  cspr_name?: string;
  /** Rank based on total balance */
  rank?: number;
}

/**
 * Account Info - data provided by account owner via Account Info Standard contract
 */
export interface AccountInfo {
  name?: string;
  website?: string;
  description?: string;
  logo_url?: string;
  /** Additional custom fields */
  [key: string]: any;
}

/**
 * Centralized Account Info - curated data provided by CSPR.cloud team
 */
export interface CentralizedAccountInfo {
  name?: string;
  website?: string;
  description?: string;
  logo_url?: string;
  is_verified?: boolean;
  /** Additional metadata */
  [key: string]: any;
}

/**
 * Query parameters for GET /accounts
 */
export interface GetAccountsParams extends PaginationParams {
  /** Filter by public key(s) - comma-separated */
  public_key?: string;
  /** Filter by account hash(es) - comma-separated */
  account_hash?: string;
  /** Filter by auction status */
  auction_status?: "inactive_bidder" | "active_bidder" | "active_validator" | "pending_validator";
}

// ============================================================================
// Deploy Entity
// ============================================================================

/**
 * Pricing mode for deploys
 */
export enum PricingMode {
  /** Default pricing (Casper 1.X) */
  Limited = 0,
  /** Flat-fee model (Casper 2.0) */
  Fixed = 1,
  /** Prepaid model (future/custom) */
  Prepaid = 2
}

/**
 * Deploy execution type identifiers
 */
export enum DeployExecutionType {
  Transfer = 0,
  ContractCall = 1,
  ContractDeploy = 2,
  // Add other execution types as documented
}

/**
 * CLType for deploy arguments
 */
export interface CLValue {
  cl_type: string | { Option: string } | { ByteArray: number };
  parsed?: any;
  bytes?: string;
}

/**
 * Deploy entity - normalized representation of Casper Network deploy
 */
export interface Deploy {
  /** Deploy hash (64 char hex string) - PRIMARY IDENTIFIER */
  deploy_hash: string;
  /** Block hash containing this deploy */
  block_hash: string;
  /** Block height */
  block_height: number;
  /** Caller public key (68 char hex) - may be null */
  caller_public_key: string | null;
  /** Caller account hash (64 char hex) */
  caller_hash: string;
  /** Deploy version: 0 (Casper 1.X), 1 (Casper 2.0 deploy), 2 (Casper 2.0 tx) */
  version_id: number;
  /** Pricing mode identifier */
  pricing_mode_id: PricingMode;
  /** Max gas price (Limited pricing mode only) */
  gas_price_limit: number;
  /** Whether using standard payment */
  is_standard_payment: boolean;
  /** Runtime type: 0 (native), 1 (VM v1), 2 (VM v2) */
  runtime_type_id: number;
  /** Total gas consumed */
  consumed_gas: string;
  /** Gas cost refunded (75% of unused in current config) */
  refund_amount: string;
  /** Execution type identifier */
  execution_type_id: number;
  /** Contract package hash called (null if no contract call) */
  contract_package_hash: string | null;
  /** Contract hash called (null if no contract call) */
  contract_hash: string | null;
  /** Entry point ID called (null if no contract call) */
  entry_point_id: number | null;
  /** Deploy session arguments */
  args: Record<string, CLValue>;
  /** Payment amount in motes (null if custom payment) */
  payment_amount: string | null;
  /** Execution cost in motes */
  cost: string;
  /** Error message if failed (null if successful) */
  error_message: string | null;
  /** Deploy status */
  status: "pending" | "expired" | "processed";
  /** Deploy creation timestamp (ISO 8601) */
  timestamp: string;

  // Optional properties
  /** Caller account info */
  account_info?: AccountInfo;
  /** Caller centralized account info */
  centralized_account_info?: CentralizedAccountInfo;
  /** Primary CSPR.name of caller */
  caller_cspr_name?: string;
  /** Contract package entity */
  contract_package?: ContractPackage;
  /** Contract entity */
  contract?: Contract;
  /** Contract entry point entity */
  contract_entrypoint?: ContractEntrypoint;
  /** CSPR rate at deploy creation */
  rate?: number;
  /** List of transfers executed */
  transfers?: Transfer[];
  /** NFT token actions resulting from deploy */
  nft_token_actions?: NFTTokenAction[];
  /** Fungible token actions resulting from deploy */
  ft_token_actions?: FungibleTokenAction[];
}

/**
 * Query parameters for GET /deploys
 */
export interface GetDeploysParams extends PaginationParams {
  /** Filter by caller public key */
  caller_public_key?: string;
  /** Filter by block hash */
  block_hash?: string;
  /** Filter by contract package hash */
  contract_package_hash?: string;
  /** Filter by contract hash */
  contract_hash?: string;
  /** Filter by entry point ID */
  contract_entrypoint_id?: number;
  /** Filter by block height range (from) */
  from_block_height?: number;
  /** Filter by block height range (to) */
  to_block_height?: number;
  /** Sort by field (default: timestamp DESC) */
  order_by?: "timestamp";
  /** Sort direction */
  order_direction?: "asc" | "desc";
}

/**
 * Query parameters for GET /accounts/{account_hash}/deploys
 */
export interface GetAccountDeploysParams extends PaginationParams, OptionalIncludes {
  /** Account hash or public key */
  account_identifier: string;
  /** Sort by field */
  order_by?: "timestamp";
  /** Sort direction */
  order_direction?: "asc" | "desc";
}

// ============================================================================
// Fungible Token (CEP-18) Entities
// ============================================================================

/**
 * Fungible Token Action Types
 */
export enum FungibleTokenActionType {
  Mint = 0,
  Burn = 1,
  Transfer = 2,
  Approve = 3,
  TransferFrom = 4,
}

/**
 * Hash type indicator
 */
export enum HashType {
  Account = 0,
  Contract = 1,
}

/**
 * Fungible Token Action - actions performed on CEP-18 tokens
 */
export interface FungibleTokenAction {
  /** Deploy hash where action occurred (64 char hex) - PART 1 of identifier */
  deploy_hash: string;
  /** Block height where action occurred */
  block_height: number;
  /** Transform index in deploy execution - PART 2 of identifier */
  transform_idx: number;
  /** Fungible token contract package hash (64 char hex) */
  contract_package_hash: string;
  /** Source account/contract hash (64 char hex) */
  from_hash: string;
  /** Source hash type: 0 (account), 1 (contract) */
  from_type: HashType;
  /** Target account/contract hash (64 char hex) */
  to_hash: string;
  /** Target hash type: 0 (account), 1 (contract) */
  to_type: HashType;
  /** Action type identifier */
  ft_action_type_id: FungibleTokenActionType;
  /** Token amount (as string to avoid overflow) */
  amount: string;
  /** Action timestamp (ISO 8601) */
  timestamp: string;

  // Optional properties
  /** Contract package entity */
  contract_package?: ContractPackage;
  /** Deploy entity */
  deploy?: Deploy;
  /** Source public key (if account) */
  from_public_key?: string;
  /** Target public key (if account) */
  to_public_key?: string;
  /** Source account info (if account) */
  from_account_info?: AccountInfo;
  /** Target account info (if account) */
  to_account_info?: AccountInfo;
  /** Source centralized account info (if account) */
  from_centralized_account_info?: CentralizedAccountInfo;
  /** Target centralized account info (if account) */
  to_centralized_account_info?: CentralizedAccountInfo;
  /** Source CSPR.name (if account) */
  from_cspr_name?: string;
  /** Target CSPR.name (if account) */
  to_cspr_name?: string;
}

/**
 * Query parameters for GET /fungible-token-actions
 */
export interface GetFungibleTokenActionsParams extends PaginationParams {
  /** Filter by contract package hash */
  contract_package_hash?: string;
  /** Filter by account hash (from or to) */
  account_hash?: string;
  /** Filter by action type */
  ft_action_type_id?: FungibleTokenActionType;
  /** Filter by timestamp (from) - ISO 8601 */
  from_timestamp?: string;
  /** Filter by timestamp (to) - ISO 8601 */
  to_timestamp?: string;
}

/**
 * Query parameters for GET /accounts/{account_hash}/fungible-token-actions
 */
export interface GetAccountFungibleTokenActionsParams extends PaginationParams, OptionalIncludes {
  /** Account hash */
  account_hash: string;
  /** Filter by contract package hash */
  contract_package_hash?: string;
  /** Filter by action type */
  ft_action_type_id?: FungibleTokenActionType;
}

/**
 * Fungible Token Ownership - account's token balance in a contract
 */
export interface FungibleTokenOwnership {
  /** Owner account hash */
  owner_hash: string;
  /** Token contract package hash */
  contract_package_hash: string;
  /** Token balance (as string) */
  balance: string;
  /** Last updated timestamp */
  updated_at: string;

  // Optional properties
  /** Owner public key */
  owner_public_key?: string;
  /** Contract package entity */
  contract_package?: ContractPackage;
  /** Owner account info */
  account_info?: AccountInfo;
}

// ============================================================================
// Non-Fungible Token (NFT - CEP-47/CEP-78) Entities
// ============================================================================

/**
 * NFT Action Types
 */
export enum NFTActionType {
  Mint = 0,
  Burn = 1,
  Transfer = 2,
  Approve = 3,
  ApproveForAll = 4,
  Revoke = 5,
}

/**
 * NFT Token - represents individual NFT
 */
export interface NFTToken {
  /** NFT contract package hash (64 char hex) */
  contract_package_hash: string;
  /** Token identifier (format depends on NFT standard) */
  token_id: string;
  /** Current owner account/contract hash */
  owner_hash: string;
  /** Owner hash type */
  owner_type: HashType;
  /** Token metadata (JSON) */
  metadata?: any;
  /** Token URI pointing to metadata */
  token_uri?: string;
  /** Minting timestamp */
  minted_at: string;
  /** Last transfer timestamp */
  updated_at?: string;
  /** Whether token is burned */
  is_burned: boolean;

  // Optional properties
  /** Owner public key (if account) */
  owner_public_key?: string;
  /** Contract package entity */
  contract_package?: ContractPackage;
  /** Owner account info (if account) */
  account_info?: AccountInfo;
  /** Owner centralized account info (if account) */
  centralized_account_info?: CentralizedAccountInfo;
  /** Owner CSPR.name (if account) */
  owner_cspr_name?: string;
}

/**
 * NFT Action - actions performed on NFTs
 */
export interface NFTTokenAction {
  /** Deploy hash where action occurred */
  deploy_hash: string;
  /** Block height */
  block_height: number;
  /** Transform index */
  transform_idx: number;
  /** NFT contract package hash */
  contract_package_hash: string;
  /** Token identifier */
  token_id: string;
  /** Source account/contract hash */
  from_hash: string;
  /** Source hash type */
  from_type: HashType;
  /** Target account/contract hash */
  to_hash: string;
  /** Target hash type */
  to_type: HashType;
  /** Action type */
  nft_action_type_id: NFTActionType;
  /** Action timestamp */
  timestamp: string;

  // Optional properties
  /** Contract package entity */
  contract_package?: ContractPackage;
  /** Deploy entity */
  deploy?: Deploy;
  /** NFT token entity */
  token?: NFTToken;
  /** Source public key (if account) */
  from_public_key?: string;
  /** Target public key (if account) */
  to_public_key?: string;
  /** Source account info */
  from_account_info?: AccountInfo;
  /** Target account info */
  to_account_info?: AccountInfo;
  /** Source centralized account info */
  from_centralized_account_info?: CentralizedAccountInfo;
  /** Target centralized account info */
  to_centralized_account_info?: CentralizedAccountInfo;
  /** Source CSPR.name */
  from_cspr_name?: string;
  /** Target CSPR.name */
  to_cspr_name?: string;
}

/**
 * Query parameters for GET /non-fungible-tokens
 */
export interface GetNFTsParams extends PaginationParams {
  /** Filter by contract package hash */
  contract_package_hash?: string;
  /** Filter by owner account hash */
  owner_hash?: string;
  /** Filter by token ID */
  token_id?: string;
  /** Filter burned tokens */
  is_burned?: boolean;
}

/**
 * Query parameters for GET /non-fungible-token-actions
 */
export interface GetNFTActionsParams extends PaginationParams {
  /** Filter by contract package hash */
  contract_package_hash?: string;
  /** Filter by account hash (from or to) */
  account_hash?: string;
  /** Filter by token ID */
  token_id?: string;
  /** Filter by action type */
  nft_action_type_id?: NFTActionType;
}

// ============================================================================
// Validator Entity
// ============================================================================

/**
 * Validator - normalized representation of Casper Network validator
 */
export interface Validator {
  /** Validator rank based on total stake */
  rank: number;
  /** Current era identifier */
  era_id: number;
  /** Validator public key (68 char hex) - PRIMARY IDENTIFIER */
  public_key: string;
  /** Whether validator is active */
  is_active: boolean;
  /** Validator fee percentage (0-100) */
  fee: number;
  /** Number of delegators */
  delegators_number: number;
  /** Validator bid stake amount in motes */
  bid_amount: string;
  /** Total delegator stakes in motes */
  delegators_stake: string;
  /** Total stake (bid + delegators) in motes */
  total_stake: string;
  /** Validator self-stake (bid + affiliated accounts) in motes */
  self_stake: string;
  /** Self-stake percentage of total stake */
  self_share: number;
  /** Validator stake percentage of network total */
  network_share: number;
  /** Reserved delegator slots */
  reserved_slots: number;
  /** Minimum delegation amount in motes */
  minimum_delegation_amount: string;
  /** Maximum delegation amount in motes */
  maximum_delegation_amount: string;

  // Optional properties
  /** Validator account info */
  account_info?: AccountInfo;
  /** Centralized account info */
  centralized_account_info?: CentralizedAccountInfo;
  /** Primary CSPR.name */
  cspr_name?: string;
  /** Average performance metrics */
  average_performance?: ValidatorPerformance;
}

/**
 * Validator Performance - historical performance metrics
 */
export interface ValidatorPerformance {
  /** Public key */
  public_key: string;
  /** Era ID */
  era_id: number;
  /** Blocks proposed */
  blocks_proposed: number;
  /** Average block time */
  average_block_time?: number;
  /** Uptime percentage */
  uptime_percentage: number;
  /** Performance score */
  performance_score?: number;
}

/**
 * Query parameters for GET /validators
 * REQUIRED: era_id parameter
 */
export interface GetValidatorsParams extends PaginationParams {
  /** Active auction era identifier - REQUIRED */
  era_id: number;
  /** Filter by active status */
  is_active?: boolean;
  /** Filter by public key(s) - comma-separated */
  public_key?: string;
  /** Sort by field (default: total_stake DESC) */
  order_by?: "rank" | "fee" | "delegators_number" | "total_stake" | "self_stake" | "network_share";
  /** Sort direction */
  order_direction?: "asc" | "desc";
}

// ============================================================================
// Contract Entities
// ============================================================================

/**
 * Contract Package - represents deployed contract package
 */
export interface ContractPackage {
  /** Contract package hash (64 char hex) - PRIMARY IDENTIFIER */
  contract_package_hash: string;
  /** Owner public key */
  owner_public_key: string;
  /** Package name (if available) */
  name?: string;
  /** Package description */
  description?: string;
  /** Contract type (CEP-18, CEP-78, custom, etc.) */
  contract_type?: string;
  /** Deployment timestamp */
  deployed_at: string;
  /** Latest contract version hash */
  latest_contract_hash?: string;
}

/**
 * Contract - specific version of contract in package
 */
export interface Contract {
  /** Contract hash (64 char hex) - PRIMARY IDENTIFIER */
  contract_hash: string;
  /** Parent contract package hash */
  contract_package_hash: string;
  /** Contract version */
  contract_version: number;
  /** Contract name */
  name?: string;
  /** Deployment timestamp */
  deployed_at: string;
}

/**
 * Contract Entry Point - callable function in contract
 */
export interface ContractEntrypoint {
  /** Entry point ID - PRIMARY IDENTIFIER */
  entry_point_id: number;
  /** Contract hash */
  contract_hash: string;
  /** Entry point name */
  name: string;
  /** Entry point type */
  entry_point_type: string;
  /** Expected arguments */
  args?: Array<{
    name: string;
    cl_type: string;
  }>;
}

// ============================================================================
// Transfer Entity
// ============================================================================

/**
 * Transfer - successful native token (CSPR) transfer on Casper network
 * Tracked from WriteTransfer transforms in deploy execution results
 */
export interface Transfer {
  /** Transfer identifier provided by deploy caller (default: 0) */
  id: number;
  /** Deploy hash (64 char hex) */
  deploy_hash: string;
  /** Height of block where transfer happened */
  block_height: number;
  /** WriteTransfer transform key (64 char hex) */
  transform_key: string;
  /** Transfer order within the deploy */
  transfer_index: number;
  /** Deploy caller account hash (64 char hex) */
  initiator_account_hash: string;
  /** Source purse URef (format: uref-dead...beef-007) */
  from_purse: string;
  /** Target purse URef (format: uref-dead...beef-007) */
  to_purse: string;
  /** Transfer recipient account hash (64 char hex) */
  to_account_hash: string;
  /** Transfer amount in motes (string to avoid uint64 overflow) */
  amount: string;
  /** Deploy creation timestamp (ISO 8601) */
  timestamp: string;

  // Optional properties
  /** Initiator public key (68 char hex) */
  initiator_public_key?: string;
  /** Transfer recipient public key (68 char hex) */
  to_public_key?: string;
  /** Public key of account that owns source purse (null if not owned by account) */
  from_purse_public_key?: string;
  /** Public key of account that owns target purse (null if not owned by account) */
  to_purse_public_key?: string;
  /** Transfer recipient account info */
  to_account_info?: AccountInfo;
  /** Transfer recipient centralized account info */
  to_centralized_account_info?: CentralizedAccountInfo;
  /** Account info of account owning source purse (null if not owned by account) */
  from_purse_account_info?: AccountInfo;
  /** Centralized account info of account owning source purse (null if not owned by account) */
  from_purse_centralized_account_info?: CentralizedAccountInfo;
  /** Account info of account owning target purse (null if not owned by account) */
  to_purse_account_info?: AccountInfo;
  /** Centralized account info of account owning target purse (null if not owned by account) */
  to_purse_centralized_account_info?: CentralizedAccountInfo;
  /** CSPR rate for specified currency at deploy creation */
  rate?: number;
  /** Primary CSPR.name of initiator account */
  initiator_cspr_name?: string;
  /** Primary CSPR.name of recipient account */
  to_cspr_name?: string;
  /** Primary CSPR.name of account owning source purse */
  from_purse_cspr_name?: string;
  /** Primary CSPR.name of account owning target purse */
  to_purse_cspr_name?: string;
  /** Deploy entity */
  deploy?: Deploy;
}

/**
 * Query parameters for GET /accounts/{account_hash}/transfers
 */
export interface GetAccountTransfersParams extends PaginationParams, OptionalIncludes {
  /** Account hash or public key */
  account_hash: string;
}

/**
 * Query parameters for GET /purses/{purse_uref}/transfers
 */
export interface GetPurseTransfersParams extends PaginationParams, OptionalIncludes {
  /** Purse URef */
  purse_uref: string;
}

/**
 * Query parameters for GET /deploys/{deploy_hash}/transfers
 */
export interface GetDeployTransfersParams extends PaginationParams {
  /** Deploy hash */
  deploy_hash: string;
}

// ============================================================================
// Delegation Entities
// ============================================================================

/**
 * Delegator identifier type
 */
export enum DelegatorIdentifierType {
  /** Public key identifier */
  PublicKey = 0,
  /** Purse URef identifier */
  PurseURef = 1,
}

/**
 * Delegation - record of delegation transaction in Casper Network staking
 */
export interface Delegation {
  /** Delegator identifier - hex-encoded public key or purse URef (64 char) */
  delegator_identifier: string;
  /** Delegator identifier type: 0 (PublicKey), 1 (purse URef) */
  delegator_identifier_type_id: DelegatorIdentifierType;
  /** @deprecated Use delegator_identifier instead - will be removed in future versions */
  public_key: string;
  /** Validator public key (68 char hex) */
  validator_public_key: string;
  /** Delegation amount in motes (string to avoid uint64 overflow) */
  stake: string;
  /** URef of bonding purse (format: uref-dead...beef-007) */
  bonding_purse: string;

  // Optional properties
  /** Account info provided by delegator */
  account_info?: AccountInfo;
  /** Account info provided by validator */
  validator_account_info?: AccountInfo;
  /** Centralized account info for known accounts */
  centralized_account_info?: CentralizedAccountInfo;
  /** Bidder auction info of the validator */
  bidder?: Bidder;
  /** Primary CSPR.name of the delegator account */
  cspr_name?: string;
  /** Primary CSPR.name of the validator account */
  validator_cspr_name?: string;
}

/**
 * Query parameters for GET /accounts/{account_hash}/delegations
 */
export interface GetAccountDelegationsParams extends PaginationParams, OptionalIncludes {
  /** Account hash or public key */
  account_hash: string;
}

/**
 * Query parameters for GET /purses/{purse_uref}/delegations
 */
export interface GetPurseDelegationsParams extends PaginationParams, OptionalIncludes {
  /** Purse URef */
  purse_uref: string;
}

/**
 * Query parameters for GET /validators/{validator_public_key}/delegations
 */
export interface GetValidatorDelegationsParams extends PaginationParams, OptionalIncludes {
  /** Validator public key */
  validator_public_key: string;
}

/**
 * Bidder - validator or candidate participating in auction
 */
export interface Bidder {
  /** Bidder public key */
  public_key: string;
  /** Bid amount in motes */
  bid_amount: string;
  /** Whether currently active */
  is_active: boolean;
  /** Fee percentage */
  fee: number;
}

/**
 * Delegator Reward - rewards earned by delegator
 */
export interface DelegatorReward {
  /** Era ID */
  era_id: number;
  /** Delegator public key */
  public_key: string;
  /** Validator public key */
  validator_public_key: string;
  /** Reward amount in motes */
  amount: string;
  /** Reward timestamp */
  timestamp: string;
}

// ============================================================================
// Rate & Price Entities
// ============================================================================

/**
 * Currency - fiat and cryptocurrencies used in rate APIs
 */
export interface Currency {
  /** Currency ID */
  currency_id: number;
  /** Currency code (USD, EUR, BTC, etc.) */
  code: string;
  /** Currency name */
  name: string;
  /** Currency symbol */
  symbol?: string;
}

/**
 * CSPR Rate - historical CSPR price to fiat/crypto
 * Maintained by CSPR.cloud from CoinGecko data
 */
export interface CSPRRate {
  /** Currency identifier */
  currency_id: number;
  /** Rate amount */
  amount: number;
  /** Rate timestamp (ISO 8601) */
  timestamp: string;
}

/**
 * Query parameters for GET /cspr-rates/current
 */
export interface GetCurrentCSPRRateParams {
  /** Currency ID - REQUIRED */
  currency_id: number;
}

/**
 * Query parameters for GET /cspr-rates
 */
export interface GetHistoricalCSPRRatesParams extends PaginationParams {
  /** Currency ID - REQUIRED */
  currency_id: number;
  /** Start timestamp (ISO 8601) */
  from_timestamp?: string;
  /** End timestamp (ISO 8601) */
  to_timestamp?: string;
}

/**
 * Fungible Token Rate - historical token price
 */
export interface FungibleTokenRate {
  /** Contract package hash */
  contract_package_hash: string;
  /** Currency ID */
  currency_id: number;
  /** DEX ID where rate was observed */
  dex_id?: number;
  /** Rate value */
  rate: number;
  /** Rate timestamp */
  timestamp: string;
}

/**
 * Fungible Token Daily Rate - average daily rate aggregation
 */
export interface FungibleTokenDailyRate {
  /** Contract package hash */
  contract_package_hash: string;
  /** Currency ID */
  currency_id: number;
  /** DEX IDs used in aggregation */
  dex_ids: number[];
  /** Average rate for the day */
  average_rate: number;
  /** Date (ISO 8601 date format) */
  date: string;
}

// ============================================================================
// Block Entity
// ============================================================================

/**
 * Block - normalized representation of Casper Network block
 * Note: Does NOT contain executed deploy hashes - query separately via Deploy API
 */
export interface Block {
  /** Block height - PRIMARY IDENTIFIER */
  block_height: number;
  /** Block hash (64 char hex) - SECONDARY IDENTIFIER */
  block_hash: string;
  /** Parent block hash (64 char hex) */
  parent_block_hash: string;
  /** State root hash after executing block's deploys (64 char hex) */
  state_root_hash: string;
  /** Era ID in which block was created */
  era_id: number;
  /** Public key of validator who proposed block (68 char hex) */
  proposer_public_key: string;
  /** True if block is last one in the era */
  is_switch_block: boolean;
  /** Gas price (cost per unit of gas) for deploys in block */
  gas_price: number;
  /** Block version: 1 for Casper 2.0, 0 for 1.X versions */
  version_id: number;
  /** Number of native transfer deploys in block */
  native_transfers_number: number;
  /** Number of contract calls in block */
  contract_calls_number: number;
  /** Number of auction-related transactions in block */
  auction_txn_number: number;
  /** Number of install/upgrade transactions in block */
  install_upgrade_txn_number: number;
  /** Number of small transactions in block (see chainspec.toml) */
  small_txn_number: number;
  /** Number of medium transactions in block (see chainspec.toml) */
  medium_txn_number: number;
  /** Number of large transactions in block (see chainspec.toml) */
  large_txn_number: number;
  /** Timestamp when block was proposed (ISO 8601) */
  timestamp: string;

  // Optional properties
  /** Account info provided by proposer account */
  proposer_account_info?: AccountInfo;
  /** Centralized account info for block proposer */
  proposer_centralized_account_info?: CentralizedAccountInfo;
  /** Primary CSPR.name of block proposer account */
  proposer_cspr_name?: string;
}

/**
 * Query parameters for GET /blocks
 */
export interface GetBlocksParams extends PaginationParams {
  /** Filter by block hash */
  block_hash?: string;
  /** Filter by block height */
  block_height?: number;
  /** Filter by era ID */
  era_id?: number;
  /** Filter by proposer public key */
  proposer_public_key?: string;
  /** Filter switch blocks only */
  is_switch_block?: boolean;
  /** Filter by block height range (from) */
  from_block_height?: number;
  /** Filter by block height range (to) */
  to_block_height?: number;
  /** Sort by field (default: block_height DESC) */
  order_by?: "block_height" | "timestamp";
  /** Sort direction */
  order_direction?: "asc" | "desc";
}

/**
 * Query parameters for GET /blocks/{block_hash}
 */
export interface GetBlockParams {
  /** Block hash (64 char hex) */
  block_hash: string;
}

/**
 * Query parameters for GET /validators/{validator_public_key}/blocks
 */
export interface GetValidatorBlocksParams extends PaginationParams {
  /** Validator public key */
  validator_public_key: string;
  /** Filter by era ID */
  era_id?: number;
}

// ============================================================================
// DEX Entity
// ============================================================================

/**
 * DEX - decentralized exchange operating on Casper Network
 */
export interface DEX {
  /** DEX identifier */
  id: number;
  /** DEX name */
  name: string;
}

/**
 * Query parameters for GET /dexes
 */
export interface GetDEXesParams extends PaginationParams {
  /** Filter by DEX ID */
  id?: number;
  /** Filter by DEX name */
  name?: string;
}

// ============================================================================
// Auction Metrics
// ============================================================================

/**
 * Auction Metrics - calculated metrics for an era from auction info
 */
export interface AuctionMetrics {
  /** Current era identifier */
  current_era_id: number;
  /** Current number of active validators */
  active_validator_number: number;
  /** Total number of bidders */
  total_bids_number: number;
  /** Number of active bidders */
  active_bids_number: number;
  /** Total sum of all validator stakes from current and next era (string to avoid uint64 overflow) */
  total_active_era_stake: string;
}

/**
 * Query parameters for GET /auction-metrics
 * No parameters required - returns current era metrics
 */
export interface GetAuctionMetricsParams {
  // No parameters - endpoint returns current era metrics
}

// ============================================================================
// CSPR Supply Entity
// ============================================================================

/**
 * CSPR Supply - total and circulating supply of mainnet CSPR token
 * Circulating supply calculated per Casper website methodology
 * Note: Correct circulating supply only available on Mainnet
 */
export interface CSPRSupply {
  /** Token identifier (always "CSPR") */
  token: string;
  /** Total available supply of the token */
  total: string;
  /** Circulating supply calculated per Casper website approach */
  circulating: string;
  /** Latest timestamp when supply was updated (ISO 8601) */
  timestamp: string;
}

/**
 * Query parameters for GET /cspr-supply
 * No parameters required
 */
export interface GetCSPRSupplyParams {
  // No parameters - endpoint returns current supply
}

// ============================================================================
// Validator Reward Entity
// ============================================================================

/**
 * Validator Reward - reward received by validator for specific era
 */
export interface ValidatorReward {
  /** Validator public key (64 char hex) - IDENTIFIER */
  public_key: string;
  /** Era identifier */
  era_id: number;
  /** Reward type ID */
  type: number;
  /** Reward amount in motes (string to avoid uint64 overflow) */
  amount: string;
  /** Timestamp when last block in era was proposed (ISO 8601) */
  timestamp: string;

  // Optional properties
  /** CSPR rate at time of last block proposal */
  rate?: number;
}

/**
 * Query parameters for GET /validators/{validator_public_key}/rewards
 */
export interface GetValidatorRewardsParams extends PaginationParams, OptionalIncludes {
  /** Validator public key */
  validator_public_key: string;
  /** Filter by era ID */
  era_id?: number;
  /** Sort by field */
  order_by?: "era_id" | "timestamp" | "amount";
  /** Sort direction */
  order_direction?: "asc" | "desc";
}

/**
 * Query parameters for GET /validators/{validator_public_key}/rewards/total
 */
export interface GetValidatorTotalRewardsParams extends OptionalIncludes {
  /** Validator public key */
  validator_public_key: string;
  /** Start era ID (inclusive) */
  from_era_id?: number;
  /** End era ID (inclusive) */
  to_era_id?: number;
}

/**
 * Query parameters for GET /validators/{validator_public_key}/rewards/era/{era_id}
 */
export interface GetValidatorEraRewardsParams extends OptionalIncludes {
  /** Validator public key */
  validator_public_key: string;
  /** Era ID */
  era_id: number;
}

// ============================================================================
// Helper Types
// ============================================================================

/**
 * Sort order
 */
export type SortOrder = "asc" | "desc";

/**
 * Common fields parameter for including related entities
 */
export interface FieldsParam {
  /** Comma-separated list of fields to include */
  fields?: string;
}

/**
 * Timestamp range filter
 */
export interface TimestampRange {
  /** Start timestamp (ISO 8601) */
  from_timestamp?: string;
  /** End timestamp (ISO 8601) */
  to_timestamp?: string;
}

/**
 * Block height range filter
 */
export interface BlockHeightRange {
  /** Start block height */
  from_block_height?: number;
  /** End block height */
  to_block_height?: number;
}
