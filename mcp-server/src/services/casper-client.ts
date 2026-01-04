/**
 * Casper Network RPC Client
 *
 * Provides a typed wrapper around the casper-js-sdk RPC client
 * for interacting with Casper Network blockchain.
 */

// Fix for ESM/CommonJS interop - casper-js-sdk is CommonJS
import casperSdk from "casper-js-sdk";
import type { RpcClient as RpcClientType } from "casper-js-sdk";
const { HttpHandler, RpcClient, PublicKey, PurseIdentifier } = casperSdk;

import { MOTES_PER_CSPR } from "../constants.js";

export interface BalanceResult {
  balance: string;
  balanceMotes: string;
}

export interface ValidatorInfo {
  public_key: string;
  total_stake_cspr: string;
  delegation_rate: number;
  delegator_count: number;
}

export interface DelegationInfo {
  validator_public_key: string;
  staked_amount_cspr: string;
}

export class CasperClient {
  private rpcClient: RpcClientType;
  private rpcUrl: string;
  private apiKey?: string;

  constructor(rpcUrl: string, apiKey?: string) {
    this.rpcUrl = rpcUrl;
    this.apiKey = apiKey;
    const handler = new HttpHandler(rpcUrl);

    // Configure authorization header if API key is provided
    if (apiKey) {
      handler.setCustomHeaders({ Authorization: apiKey });
    }

    this.rpcClient = new RpcClient(handler);
  }

  /**
   * Get the RPC URL this client is connected to
   */
  getRpcUrl(): string {
    return this.rpcUrl;
  }

  /**
   * Get the API key for RPC authentication (if configured)
   */
  getApiKey(): string | undefined {
    return this.apiKey;
  }

  /**
   * Get the network name based on RPC URL
   *
   * NOTE: This uses URL pattern matching which works for standard Casper RPC endpoints.
   * For custom/local nodes, consider querying chain_spec from the node directly.
   */
  getNetwork(): string {
    return this.rpcUrl.includes("testnet") ? "testnet" : "mainnet";
  }

  /**
   * Get the chain name for deploys
   *
   * NOTE: Uses URL pattern matching. For production with custom nodes,
   * consider querying the actual chain name from the node.
   */
  getChainName(): string {
    return this.rpcUrl.includes("testnet") ? "casper-test" : "casper";
  }

  /**
   * Get account balance in CSPR and motes
   */
  async getBalance(publicKeyHex: string): Promise<BalanceResult> {
    const publicKey = PublicKey.fromHex(publicKeyHex);
    const purseIdentifier = PurseIdentifier.fromPublicKey(publicKey);
    const result = await this.rpcClient.queryLatestBalance(purseIdentifier);

    const balanceMotes = result.balance.toString();
    const balanceCspr = (BigInt(balanceMotes) / MOTES_PER_CSPR).toString();

    return { balance: balanceCspr, balanceMotes };
  }

  /**
   * Get latest auction info (validators, bids, delegations)
   */
  async getLatestAuctionInfo(): Promise<any> {
    return this.rpcClient.getLatestAuctionInfo();
  }

  /**
   * Get validators with their stakes and delegation info
   */
  async getValidators(): Promise<ValidatorInfo[]> {
    const auctionInfo = await this.getLatestAuctionInfo();
    const eraValidators = auctionInfo.auction_state?.era_validators || [];

    if (eraValidators.length === 0) {
      return [];
    }

    const latestEra = eraValidators[eraValidators.length - 1];
    const validatorWeights = latestEra?.validator_weights || [];
    const bids = auctionInfo.auction_state?.bids || [];

    // Create a map of bids for delegation info
    const bidMap = new Map<string, any>();
    for (const bid of bids) {
      bidMap.set(bid.public_key, bid);
    }

    return validatorWeights.map((v: any) => {
      const bid = bidMap.get(v.public_key);
      return {
        public_key: v.public_key,
        total_stake_cspr: (BigInt(v.weight) / MOTES_PER_CSPR).toString(),
        delegation_rate: bid?.bid?.delegation_rate || 0,
        delegator_count: bid?.bid?.delegators?.length || 0
      };
    });
  }

  /**
   * Get staking info for a specific delegator
   */
  async getStakingInfo(publicKeyHex: string): Promise<{
    delegations: DelegationInfo[];
    totalStaked: string;
  }> {
    const auctionInfo = await this.getLatestAuctionInfo();
    const bids = auctionInfo.auction_state?.bids || [];

    const delegations: DelegationInfo[] = [];

    for (const bid of bids) {
      const delegators = bid.bid?.delegators || [];
      for (const delegator of delegators) {
        if (delegator.delegator_public_key === publicKeyHex) {
          delegations.push({
            validator_public_key: bid.public_key,
            staked_amount_cspr: (BigInt(delegator.staked_amount) / MOTES_PER_CSPR).toString()
          });
        }
      }
    }

    const totalStaked = delegations
      .reduce((sum, d) => sum + BigInt(d.staked_amount_cspr), BigInt(0))
      .toString();

    return { delegations, totalStaked };
  }

  /**
   * Get deploy (transaction) info by hash
   * For Casper 1.5 (Deploy format)
   */
  async getDeploy(deployHash: string): Promise<any> {
    return this.rpcClient.getDeploy(deployHash);
  }

  /**
   * Get transaction info by hash
   * For Casper 2.0+ (Transaction V1 format)
   */
  async getTransaction(transactionHash: string): Promise<any> {
    // Use direct RPC call for Transaction V1
    const response = await fetch(this.rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'info_get_transaction',
        params: {
          transaction_hash: {
            Version1: transactionHash
          },
          finalized_approvals: true
        },
        id: 1
      })
    });

    const data = await response.json() as any;

    if (data.error) {
      throw new Error(`RPC error ${data.error.code}: ${data.error.message || data.error.err}${data.error.data ? ` - ${data.error.data}` : ''}`);
    }

    return data.result;
  }

  /**
   * Submit a signed transaction to the network
   * @param transaction - The signed Transaction/Deploy object
   *   - Deploy object (from makeAuctionManagerDeploy, NativeTransferBuilder.buildFor1_5, etc.)
   *   - Transaction wrapper (from builders that wrap Deploy)
   * @returns The transaction hash
   */
  async submitTransaction(transaction: any): Promise<string> {
    try {
      // Check if this is a pure Deploy object (from makeAuctionManagerDeploy, etc.)
      // Deploy objects have: header, payment, session, hash, approvals
      const isPureDeploy = transaction.header && transaction.payment && transaction.session && !transaction.getDeploy;

      let deploy: any;

      if (isPureDeploy) {
        // This is already a Deploy object - use it directly
        deploy = transaction;
      } else if (typeof transaction.getDeploy === 'function') {
        // For Casper 1.5 networks, extract the Deploy from the Transaction wrapper
        deploy = transaction.getDeploy();
      }

      if (deploy) {
        // Casper 1.5 network - submit Deploy using putDeploy
        const result = await this.rpcClient.putDeploy(deploy);
        // putDeploy returns { deployHash: Hash }
        const hash = result.deployHash;
        if (typeof (hash as any).toHex === 'function') {
          return (hash as any).toHex();
        } else if (typeof (hash as any).toJSON === 'function') {
          return (hash as any).toJSON();
        }
        return hash as any;
      }

      // For Casper 2.0+ networks, submit TransactionV1
      // SDK transaction.toJSON() produces {hash, payload, approvals}
      // but RPC expects {Version1: {hash, payload, approvals}}
      const txJSON = transaction.toJSON();
      const wrappedTransaction = {
        Version1: txJSON
      };

      // Use direct RPC call instead of SDK's putTransaction
      // because SDK method doesn't support Version1 wrapper yet
      const response = await fetch(this.rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'account_put_transaction',
          params: {
            transaction: wrappedTransaction
          },
          id: 1
        })
      });

      const data = await response.json() as any;

      if (data.error) {
        throw new Error(`RPC error ${data.error.code}: ${data.error.message}${data.error.data ? ` - ${data.error.data}` : ''}`);
      }

      // Extract transaction hash from response
      const txHashResult = data.result?.transaction_hash?.Version1 || data.result?.transaction_hash;
      return txHashResult;
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      throw new Error(`Failed to submit transaction: ${errorMsg}`);
    }
  }

  /**
   * Get the current state root hash
   */
  async getStateRootHash(): Promise<string> {
    const result = await this.rpcClient.getStateRootHashLatest();
    return result.stateRootHash?.toJSON() || "";
  }

  /**
   * Convert a public key to an account hash
   */
  publicKeyToAccountHash(publicKeyHex: string): string {
    const publicKey = PublicKey.fromHex(publicKeyHex);
    return publicKey.accountHash().toJSON();
  }

  /**
   * Validate a public key format
   */
  validatePublicKey(publicKeyHex: string): boolean {
    try {
      PublicKey.fromHex(publicKeyHex);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Query global state by key path
   * Used to read contract state or verify contract existence
   *
   * @param key - The key to query (e.g., contract hash)
   * @param path - The path within the state (empty array for top-level)
   * @returns The stored value at the given key and path
   */
  async queryLatestGlobalState(key: string, path: string[]): Promise<any> {
    return this.rpcClient.queryLatestGlobalState(key, path);
  }
}
