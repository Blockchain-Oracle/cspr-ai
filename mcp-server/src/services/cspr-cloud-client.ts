/**
 * CSPR.cloud REST API Client
 *
 * Service for interacting with cspr.cloud REST API for querying
 * Casper Network data (deploys, tokens, NFTs, validators, etc.)
 *
 * API Documentation: https://docs.cspr.cloud
 */

import type {
  // Pagination
  PaginatedResponse,

  // Account types
  Account,
  GetAccountsParams,
  GetAccountDeploysParams,
  GetAccountTransfersParams,
  GetAccountFungibleTokenActionsParams,
  GetAccountDelegationsParams,

  // Deploy types
  Deploy,
  GetDeploysParams,

  // Token types
  FungibleTokenAction,
  GetFungibleTokenActionsParams,
  FungibleTokenOwnership,

  // NFT types
  NFTToken,
  NFTTokenAction,
  GetNFTsParams,
  GetNFTActionsParams,

  // Transfer types
  Transfer,

  // Validator types
  Validator,
  GetValidatorsParams,
  ValidatorReward,
  GetValidatorRewardsParams,
  GetValidatorBlocksParams,

  // Delegation types
  Delegation,

  // Block types
  Block,
  GetBlocksParams,

  // DEX types
  DEX,
  GetDEXesParams,

  // Rate types
  CSPRRate,
  GetCurrentCSPRRateParams,

  // Supply types
  CSPRSupply,

  // Auction types
  AuctionMetrics
} from "../types/cspr-cloud.js";

/**
 * Network configuration for cspr.cloud API
 */
export type CsprCloudNetwork = "testnet" | "mainnet";

/**
 * CSPR.cloud API Client
 *
 * Provides methods for querying Casper Network data via cspr.cloud REST API
 */
export class CsprCloudClient {
  private readonly baseUrl: string;
  private readonly network: CsprCloudNetwork;
  private readonly apiKey?: string;

  // Validation patterns
  private static readonly HASH_PATTERN = /^[a-f0-9]{64}$/i;
  private static readonly ACCOUNT_HASH_PATTERN = /^account-hash-[a-f0-9]{64}$/i;
  private static readonly PUBLIC_KEY_PATTERN = /^[0-9a-f]{66}$/i;
  // Validator public keys: Ed25519 (01 prefix) = 66 chars, Secp256k1 (02 prefix) = 68 chars
  private static readonly VALIDATOR_PUBLIC_KEY_PATTERN = /^(01[0-9a-f]{64}|02[0-9a-f]{66})$/i;

  constructor(network: CsprCloudNetwork = "testnet", apiKey?: string) {
    this.network = network;
    this.apiKey = apiKey;
    this.baseUrl =
      network === "mainnet"
        ? "https://api.cspr.cloud"
        : "https://api.testnet.cspr.cloud";
  }

  /**
   * Validate deploy hash format
   */
  private validateDeployHash(deployHash: string): void {
    if (!CsprCloudClient.HASH_PATTERN.test(deployHash)) {
      throw new Error(
        `Invalid deploy hash format: ${deployHash}. Expected 64 hexadecimal characters.`
      );
    }
  }

  /**
   * Validate account identifier (account-hash or public key)
   */
  private validateAccountIdentifier(identifier: string): void {
    const isAccountHash = CsprCloudClient.ACCOUNT_HASH_PATTERN.test(identifier);
    const isPublicKey = CsprCloudClient.PUBLIC_KEY_PATTERN.test(identifier);

    if (!isAccountHash && !isPublicKey) {
      throw new Error(
        `Invalid account identifier: ${identifier}. Expected account-hash-<64-hex> or 66-character public key.`
      );
    }
  }

  /**
   * Validate validator public key format
   * Ed25519: 01 prefix + 64 hex = 66 chars
   * Secp256k1: 02 prefix + 66 hex = 68 chars
   */
  private validateValidatorPublicKey(publicKey: string): void {
    if (!CsprCloudClient.VALIDATOR_PUBLIC_KEY_PATTERN.test(publicKey)) {
      throw new Error(
        `Invalid validator public key: ${publicKey}. Expected Ed25519 (01+64hex=66 chars) or Secp256k1 (02+66hex=68 chars).`
      );
    }
  }

  /**
   * Validate contract package hash format
   */
  private validateContractPackageHash(hash: string): void {
    if (!CsprCloudClient.HASH_PATTERN.test(hash)) {
      throw new Error(
        `Invalid contract package hash: ${hash}. Expected 64 hexadecimal characters.`
      );
    }
  }

  /**
   * Validate block identifier (hash or height)
   */
  private validateBlockIdentifier(identifier: string | number): void {
    if (typeof identifier === "number") {
      if (identifier < 0 || !Number.isInteger(identifier)) {
        throw new Error(`Invalid block height: ${identifier}. Must be a non-negative integer.`);
      }
    } else {
      if (!CsprCloudClient.HASH_PATTERN.test(identifier)) {
        throw new Error(
          `Invalid block hash: ${identifier}. Expected 64 hexadecimal characters.`
        );
      }
    }
  }

  /**
   * Get network name
   */
  getNetwork(): CsprCloudNetwork {
    return this.network;
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async fetch<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    // Add query parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    // Prepare headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    // Add authorization header if API key is provided
    // cspr.cloud API expects just the key value, not "Bearer {key}"
    if (this.apiKey) {
      headers["authorization"] = this.apiKey;
    }

    // Set up timeout using AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

    try {
      const response = await fetch(url.toString(), {
        headers,
        signal: controller.signal
      });

      if (!response.ok) {
        // Try to parse error as JSON for better error messages
        const errorText = await response.text();
        let errorMessage: string;

        try {
          const errorData = JSON.parse(errorText);
          // Extract message from common error response formats
          errorMessage = errorData.message || errorData.error || errorText;
        } catch {
          // Fall back to raw text if JSON parsing fails
          errorMessage = errorText;
        }

        throw new Error(
          `cspr.cloud API error (${response.status}): ${errorMessage}`
        );
      }

      return response.json() as Promise<T>;
    } catch (error) {
      // Handle timeout errors
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error(
          `cspr.cloud API request timeout after 30 seconds for ${endpoint}`
        );
      }
      // Re-throw other errors
      throw error;
    } finally {
      // Always clear the timeout
      clearTimeout(timeoutId);
    }
  }

  // ============================================================================
  // Deploy Endpoints
  // ============================================================================

  /**
   * Get deploy by hash
   * @param deployHash - Deploy hash to query
   * @returns Deploy entity
   */
  async getDeploy(deployHash: string): Promise<Deploy> {
    this.validateDeployHash(deployHash);
    return this.fetch<Deploy>(`/deploys/${deployHash}`);
  }

  /**
   * List all deploys with optional filters
   * @param params - Query parameters
   * @returns Paginated list of deploys
   */
  async getDeploys(params?: GetDeploysParams): Promise<PaginatedResponse<Deploy>> {
    return this.fetch<PaginatedResponse<Deploy>>("/deploys", params);
  }

  /**
   * Get all deploys for an account
   * @param accountIdentifier - Account hash or public key
   * @param params - Query parameters
   * @returns Paginated list of account's deploys
   */
  async getAccountDeploys(
    accountIdentifier: string,
    params?: Omit<GetAccountDeploysParams, "account_identifier">
  ): Promise<PaginatedResponse<Deploy>> {
    this.validateAccountIdentifier(accountIdentifier);
    return this.fetch<PaginatedResponse<Deploy>>(
      `/accounts/${accountIdentifier}/deploys`,
      params
    );
  }

  // ============================================================================
  // Account Endpoints
  // ============================================================================

  /**
   * Get account details
   * @param accountIdentifier - Account hash or public key
   * @returns Account entity
   */
  async getAccount(accountIdentifier: string): Promise<Account> {
    this.validateAccountIdentifier(accountIdentifier);
    return this.fetch<Account>(`/accounts/${accountIdentifier}`);
  }

  /**
   * List accounts with optional filters
   * @param params - Query parameters
   * @returns Paginated list of accounts
   */
  async getAccounts(params?: GetAccountsParams): Promise<PaginatedResponse<Account>> {
    return this.fetch<PaginatedResponse<Account>>("/accounts", params);
  }

  // ============================================================================
  // Transfer Endpoints
  // ============================================================================

  /**
   * Get CSPR transfers for an account
   * @param accountHash - Account hash or public key
   * @param params - Query parameters
   * @returns Paginated list of transfers
   */
  async getAccountTransfers(
    accountHash: string,
    params?: Omit<GetAccountTransfersParams, "account_hash">
  ): Promise<PaginatedResponse<Transfer>> {
    this.validateAccountIdentifier(accountHash);
    return this.fetch<PaginatedResponse<Transfer>>(
      `/accounts/${accountHash}/transfers`,
      params
    );
  }

  // ============================================================================
  // Fungible Token (CEP-18) Endpoints
  // NOTE: These endpoints are MAINNET ONLY - not available on testnet
  // For testnet, use custom contract tools (casper_query_token, etc.) instead
  // ============================================================================

  /**
   * Get fungible token actions (transfers, mints, burns)
   * @deprecated MAINNET ONLY - not available on testnet
   * @param params - Query parameters
   * @returns Paginated list of token actions
   */
  async getFungibleTokenActions(
    params?: GetFungibleTokenActionsParams
  ): Promise<PaginatedResponse<FungibleTokenAction>> {
    return this.fetch<PaginatedResponse<FungibleTokenAction>>(
      "/fungible-token-actions",
      params
    );
  }

  /**
   * Get fungible token actions for a specific account
   * @param accountHash - Account hash
   * @param params - Query parameters
   * @returns Paginated list of account's token actions
   */
  async getAccountFungibleTokenActions(
    accountHash: string,
    params?: Omit<GetAccountFungibleTokenActionsParams, "account_hash">
  ): Promise<PaginatedResponse<FungibleTokenAction>> {
    this.validateAccountIdentifier(accountHash);
    return this.fetch<PaginatedResponse<FungibleTokenAction>>(
      `/accounts/${accountHash}/fungible-token-actions`,
      params
    );
  }

  /**
   * Get account's fungible token balances
   * @param accountHash - Account hash
   * @returns List of token ownerships
   */
  async getAccountTokens(accountHash: string): Promise<FungibleTokenOwnership[]> {
    this.validateAccountIdentifier(accountHash);
    const response = await this.fetch<PaginatedResponse<FungibleTokenOwnership>>(
      `/accounts/${accountHash}/fungible-tokens`
    );
    return response.data;
  }

  // ============================================================================
  // NFT (CEP-47/CEP-78) Endpoints
  // NOTE: These endpoints are MAINNET ONLY - not available on testnet
  // For testnet, use custom contract tools (casper_query_nft, etc.) instead
  // ============================================================================

  /**
   * Get NFT tokens with optional filters
   * @deprecated MAINNET ONLY - not available on testnet
   * @param params - Query parameters
   * @returns Paginated list of NFT tokens
   */
  async getNFTs(params?: GetNFTsParams): Promise<PaginatedResponse<NFTToken>> {
    return this.fetch<PaginatedResponse<NFTToken>>("/non-fungible-tokens", params);
  }

  /**
   * Get NFT token by collection and token ID
   * @param contractPackageHash - NFT collection contract package hash
   * @param tokenId - Token ID
   * @returns NFT token entity
   */
  async getNFT(contractPackageHash: string, tokenId: string): Promise<NFTToken> {
    this.validateContractPackageHash(contractPackageHash);
    const response = await this.getNFTs({
      contract_package_hash: contractPackageHash,
      token_id: tokenId,
      page_size: 1
    });
    if (response.data.length === 0) {
      throw new Error(`NFT not found: ${contractPackageHash}/${tokenId}`);
    }
    return response.data[0];
  }

  /**
   * Get NFTs owned by an account
   * @param accountHash - Account hash
   * @param params - Query parameters
   * @returns Paginated list of owned NFTs
   */
  async getAccountNFTs(
    accountHash: string,
    params?: Omit<GetNFTsParams, "owner_hash">
  ): Promise<PaginatedResponse<NFTToken>> {
    return this.getNFTs({ ...params, owner_hash: accountHash });
  }

  /**
   * Get NFT actions (mints, transfers, burns)
   * @param params - Query parameters
   * @returns Paginated list of NFT actions
   */
  async getNFTActions(
    params?: GetNFTActionsParams
  ): Promise<PaginatedResponse<NFTTokenAction>> {
    return this.fetch<PaginatedResponse<NFTTokenAction>>(
      "/non-fungible-token-actions",
      params
    );
  }

  /**
   * Get NFT actions for a specific account
   * @param accountHash - Account hash
   * @param params - Query parameters
   * @returns Paginated list of account's NFT actions
   */
  async getAccountNFTActions(
    accountHash: string,
    params?: Omit<GetNFTActionsParams, "account_hash">
  ): Promise<PaginatedResponse<NFTTokenAction>> {
    return this.getNFTActions({ ...params, account_hash: accountHash });
  }

  // ============================================================================
  // Validator Endpoints
  // ============================================================================

  /**
   * Get validators for a specific era
   * @param eraId - Era ID (required by API)
   * @param params - Additional query parameters
   * @returns Paginated list of validators
   */
  async getValidators(
    eraId: number,
    params?: Omit<GetValidatorsParams, "era_id">
  ): Promise<PaginatedResponse<Validator>> {
    return this.fetch<PaginatedResponse<Validator>>("/validators", {
      ...params,
      era_id: eraId
    });
  }

  /**
   * Get current era validators
   * Uses auction metrics to get current era ID
   * @param params - Query parameters
   * @returns Paginated list of current era validators
   */
  async getCurrentValidators(
    params?: Omit<GetValidatorsParams, "era_id">
  ): Promise<PaginatedResponse<Validator>> {
    const metrics = await this.getAuctionMetrics();
    return this.getValidators(metrics.current_era_id, params);
  }

  /**
   * Get validator rewards
   * @param validatorPublicKey - Validator public key
   * @param params - Query parameters
   * @returns Paginated list of validator rewards
   */
  async getValidatorRewards(
    validatorPublicKey: string,
    params?: Omit<GetValidatorRewardsParams, "validator_public_key">
  ): Promise<PaginatedResponse<ValidatorReward>> {
    this.validateValidatorPublicKey(validatorPublicKey);
    return this.fetch<PaginatedResponse<ValidatorReward>>(
      `/validators/${validatorPublicKey}/rewards`,
      params
    );
  }

  /**
   * Get blocks proposed by validator
   * @param validatorPublicKey - Validator public key
   * @param params - Query parameters
   * @returns Paginated list of blocks
   */
  async getValidatorBlocks(
    validatorPublicKey: string,
    params?: Omit<GetValidatorBlocksParams, "validator_public_key">
  ): Promise<PaginatedResponse<Block>> {
    this.validateValidatorPublicKey(validatorPublicKey);
    return this.fetch<PaginatedResponse<Block>>(
      `/validators/${validatorPublicKey}/blocks`,
      params
    );
  }

  // ============================================================================
  // Delegation Endpoints
  // ============================================================================

  /**
   * Get delegations for an account
   * @param accountHash - Account hash
   * @param params - Query parameters
   * @returns Paginated list of delegations
   */
  async getAccountDelegations(
    accountHash: string,
    params?: Omit<GetAccountDelegationsParams, "account_hash">
  ): Promise<PaginatedResponse<Delegation>> {
    this.validateAccountIdentifier(accountHash);
    return this.fetch<PaginatedResponse<Delegation>>(
      `/accounts/${accountHash}/delegations`,
      params
    );
  }

  // ============================================================================
  // Block Endpoints
  // ============================================================================

  /**
   * Get blocks with optional filters
   * @param params - Query parameters
   * @returns Paginated list of blocks
   */
  async getBlocks(params?: GetBlocksParams): Promise<PaginatedResponse<Block>> {
    return this.fetch<PaginatedResponse<Block>>("/blocks", params);
  }

  /**
   * Get block by hash or height
   * @param identifier - Block hash or height
   * @returns Block entity
   */
  async getBlock(identifier: string | number): Promise<Block> {
    this.validateBlockIdentifier(identifier);
    return this.fetch<Block>(`/blocks/${identifier}`);
  }

  // ============================================================================
  // DEX Endpoints
  // ============================================================================

  /**
   * Get DEXes operating on Casper Network
   * @param params - Query parameters
   * @returns Paginated list of DEXes
   */
  async getDEXes(params?: GetDEXesParams): Promise<PaginatedResponse<DEX>> {
    return this.fetch<PaginatedResponse<DEX>>("/dexes", params);
  }

  // ============================================================================
  // Rate & Price Endpoints
  // ============================================================================

  /**
   * Get current CSPR rate for a currency
   * @param currencyId - Currency ID (e.g., 1 for USD)
   * @returns Current CSPR rate
   */
  async getCurrentCSPRRate(currencyId: number): Promise<CSPRRate> {
    return this.fetch<CSPRRate>("/cspr-rates/current", { currency_id: currencyId });
  }

  // ============================================================================
  // Supply Endpoints
  // ============================================================================

  /**
   * Get CSPR total and circulating supply
   * @returns CSPR supply data
   */
  async getCSPRSupply(): Promise<CSPRSupply> {
    return this.fetch<CSPRSupply>("/cspr-supply");
  }

  // ============================================================================
  // Auction Metrics Endpoints
  // ============================================================================

  /**
   * Get current auction metrics
   * @returns Auction metrics for current era
   */
  async getAuctionMetrics(): Promise<AuctionMetrics> {
    // API wraps response in { data: {...} } - extract the inner data
    const response = await this.fetch<{ data: AuctionMetrics }>("/auction-metrics");
    return response.data;
  }
}
