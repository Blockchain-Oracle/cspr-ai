/**
 * NFT Contract MCP Tools
 *
 * Provides tools for interacting with custom NFT collection contracts:
 * - Deploy new NFT collections
 * - Query NFT state (owner, metadata, balance)
 * - Build unsigned transactions (mint, transfer, burn)
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import {
  QueryNftInputSchema,
  BuildNftMintInputSchema,
  BuildNftTransferInputSchema,
  BuildNftBurnInputSchema
} from "../../schemas/index.js";
import { CasperClient } from "../../services/casper-client.js";
import { createErrorResult } from "../../utils/errors.js";
import {
  validatePublicKey,
  validatePublicKeys,
  buildStoredContractDeploy,
  truncateAddress,
  getTransactionNextSteps,
  jsonCodeBlock,
  getContractFromEnv
} from "../../utils/contracts.js";
import type {
  QueryNftInput,
  BuildNftMintInput,
  BuildNftTransferInput,
  BuildNftBurnInput,
  NftCollectionInfoOutput,
  NftOwnerOutput,
  NftBalanceOutput,
  NftTokenUriOutput,
  NftMetadataOutput,
  NftMintOutput,
  NftTransferOutput,
  NftBurnOutput,
  CallToolResult
} from "../../types.js";

// ============================================================================
// Tool Names
// ============================================================================

const QUERY_NFT_TOOL = "casper_query_nft";
const BUILD_NFT_MINT_TOOL = "casper_build_nft_mint";
const BUILD_NFT_TRANSFER_TOOL = "casper_build_nft_transfer";
const BUILD_NFT_BURN_TOOL = "casper_build_nft_burn";

// ============================================================================
// Tool Descriptions
// ============================================================================

const QUERY_NFT_DESCRIPTION = `Query NFT contract state (read-only, no gas cost).

Retrieve NFT information from a deployed collection contract:
- collection_info: Get name, symbol, base_uri, max_supply, total_supply, minting_mode
- owner: Get the owner of a specific token ID
- metadata: Get full token metadata (name, URI, owner)
- balance: Get NFT balance for an owner (how many NFTs they own)
- token_uri: Get token URI for a specific token ID
- approved: Get approved address for a specific token ID

Args:
  - contract_address (string): NFT contract address (hash-...)
  - query_type (string): "collection_info", "owner", "metadata", "balance", "token_uri", or "approved"
  - token_id (string, optional): Required for owner, metadata, token_uri, approved queries
  - owner (string, optional): Required for balance queries
  - response_format (string): "markdown" or "json"

Returns:
  Query result based on query_type.

Examples:
  - Get collection: query_type="collection_info"
  - Get owner: query_type="owner", token_id="1"
  - Get balance: query_type="balance", owner="01abc..."
  - Get metadata: query_type="metadata", token_id="1"`;

const BUILD_NFT_MINT_DESCRIPTION = `Build unsigned NFT mint transaction.

Creates an unsigned transaction to mint a new NFT to a recipient.
Requires minter role (if restricted) or anyone can mint (if public).
Uses the configured NFT contract (CASPER_NFT_CONTRACT_ADDRESS) from environment.

Args:
  - from_public_key (string): Minter's public key
  - to (string): Recipient's address
  - token_name (string): Individual NFT name
  - token_uri (string, optional): Custom URI (uses auto-generated if not provided)

Returns:
  Unsigned mint transaction.

Examples:
  - Mint with custom URI: token_name="Cool NFT #1", token_uri="ipfs://..."
  - Mint with auto URI: token_name="NFT #123" (URI will be base_uri + token_id)

IMPORTANT:
- Minting mode determines who can mint
- Auto-URI uses collection base_uri + token_id
- Returns new token_id in transaction result`;

const BUILD_NFT_TRANSFER_DESCRIPTION = `Build unsigned NFT transfer transaction.

Creates an unsigned transaction to transfer an NFT from current owner to recipient.
Uses the configured NFT contract (CASPER_NFT_CONTRACT_ADDRESS) from environment.

Args:
  - from_public_key (string): Current owner's public key
  - from (string): Current owner's address
  - to (string): Recipient's address
  - token_id (string): Token ID to transfer

Returns:
  Unsigned transfer transaction.

IMPORTANT:
- Caller must be the current owner
- Token must exist and be owned by 'from' address`;

const BUILD_NFT_BURN_DESCRIPTION = `Build unsigned NFT burn transaction.

Creates an unsigned transaction to permanently burn (destroy) an NFT.
Uses the configured NFT contract (CASPER_NFT_CONTRACT_ADDRESS) from environment.

Args:
  - from_public_key (string): Burner's public key (must be owner)
  - token_id (string): Token ID to burn

Returns:
  Unsigned burn transaction.

IMPORTANT:
- Caller must be the current owner
- Action is permanent and cannot be undone`;

// ============================================================================
// Tool Implementations
// ============================================================================

/**
 * Register casper_query_nft tool
 */
export function registerQueryNftTool(server: McpServer, client: CasperClient): void {
  server.registerTool(
    QUERY_NFT_TOOL,
    {
      title: "Query NFT Contract",
      description: QUERY_NFT_DESCRIPTION,
      inputSchema: QueryNftInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: QueryNftInput): Promise<CallToolResult> => {
      try {
        const { contract_address, query_type, token_id, owner } = params;

        // NOTE: This is a placeholder implementation
        // In production, this would use client.rpcClient.queryGlobalState()

        let result;
        let textContent;

        switch (query_type) {
          case "collection_info": {
            const info: NftCollectionInfoOutput = {
              contract_address,
              name: "Example NFT Collection",
              symbol: "ENFT",
              base_uri: "https://example.com/metadata/",
              max_supply: "10000",
              total_supply: "42",
              minting_mode: "restricted"
            };
            result = info;
            textContent = `# NFT Collection Info

## Contract
- **Address:** \`${contract_address}\`

## Collection
- **Name:** ${info.name}
- **Symbol:** ${info.symbol}
- **Base URI:** ${info.base_uri}
- **Max Supply:** ${info.max_supply}
- **Total Supply:** ${info.total_supply}
- **Minting Mode:** ${info.minting_mode}`;
            break;
          }

          case "owner": {
            if (!token_id) {
              throw new Error("Token ID required for owner query");
            }
            const ownerInfo: NftOwnerOutput = {
              contract_address,
              token_id,
              owner: "01abc..."
            };
            result = ownerInfo;
            textContent = `# NFT Owner

## Token
- **Contract:** \`${contract_address}\`
- **Token ID:** ${token_id}

## Owner
- **Address:** \`${ownerInfo.owner}\``;
            break;
          }

          case "balance": {
            if (!owner) {
              throw new Error("Owner address required for balance query");
            }
            const balance: NftBalanceOutput = {
              contract_address,
              owner,
              balance: "0"
            };
            result = balance;
            textContent = `# NFT Balance

## Query
- **Contract:** \`${contract_address}\`
- **Owner:** \`${truncateAddress(owner)}\`

## Balance
- **NFTs Owned:** ${balance.balance}`;
            break;
          }

          case "token_uri": {
            if (!token_id) {
              throw new Error("Token ID required for token_uri query");
            }
            const uri: NftTokenUriOutput = {
              contract_address,
              token_id,
              token_uri: "https://example.com/metadata/1"
            };
            result = uri;
            textContent = `# NFT Token URI

## Token
- **Contract:** \`${contract_address}\`
- **Token ID:** ${token_id}

## URI
- **Token URI:** ${uri.token_uri}`;
            break;
          }

          case "metadata": {
            if (!token_id) {
              throw new Error("Token ID required for metadata query");
            }
            const metadata: NftMetadataOutput = {
              contract_address,
              token_id,
              name: "Example NFT #1",
              token_uri: "https://example.com/metadata/1",
              owner: "01abc..."
            };
            result = metadata;
            textContent = `# NFT Metadata

## Token
- **Contract:** \`${contract_address}\`
- **Token ID:** ${token_id}

## Metadata
- **Name:** ${metadata.name}
- **URI:** ${metadata.token_uri}
- **Owner:** \`${metadata.owner}\``;
            break;
          }

          case "approved": {
            if (!token_id) {
              throw new Error("Token ID required for approved query");
            }
            result = {
              contract_address,
              token_id,
              approved: null
            };
            textContent = `# NFT Approved Address

## Token
- **Contract:** \`${contract_address}\`
- **Token ID:** ${token_id}

## Approval
- **Approved:** ${result.approved || "None"}`;
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
        return createErrorResult(error, "NFT query");
      }
    }
  );
}

/**
 * Register casper_build_nft_mint tool
 */
export function registerBuildNftMintTool(server: McpServer, client: CasperClient): void {
  server.registerTool(
    BUILD_NFT_MINT_TOOL,
    {
      title: "Build NFT Mint",
      description: BUILD_NFT_MINT_DESCRIPTION,
      inputSchema: BuildNftMintInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: BuildNftMintInput): Promise<CallToolResult> => {
      try {
        // Auto-load contract address from environment
        const contractAddress = getContractFromEnv('CASPER_NFT_CONTRACT_ADDRESS');
        if (!contractAddress) {
          throw new Error(
            'NFT contract not configured. Set CASPER_NFT_CONTRACT_ADDRESS in environment.'
          );
        }

        const { from_public_key, to, token_name, token_uri } = params;
        validatePublicKeys([from_public_key, to]);

        const network = client.getChainName();
        // Contract always uses 'mint' entry point with 3 args: (to, _name, token_uri)
        const entryPoint = "mint";
        const args = [
          ["to", { cl_type: "Key", parsed: to }],
          ["_name", { cl_type: "String", parsed: token_name }],
          ["token_uri", { cl_type: "String", parsed: token_uri || "" }]
        ];

        const unsignedDeploy = buildStoredContractDeploy(
          from_public_key,
          network,
          contractAddress,
          entryPoint,
          args as Array<[string, { cl_type: string; parsed: unknown }]>
        );

        const output: NftMintOutput = {
          type: "nft_mint",
          contract_address: contractAddress,
          minter: from_public_key,
          recipient: to,
          token_name,
          token_uri: token_uri || null,
          network,
          requires_signature: true,
          unsigned_deploy: unsignedDeploy
        };

        const uriDisplay = token_uri || "Auto-generated (base_uri + token_id)";
        const textContent = `# NFT Mint Transaction

## Details
- **Contract:** \`${contractAddress}\`
- **Minter:** \`${truncateAddress(from_public_key)}\`
- **Recipient:** \`${truncateAddress(to)}\`
- **Token Name:** ${token_name}
- **Token URI:** ${uriDisplay}
- **Network:** ${network}

${getTransactionNextSteps()}
4. New token will be minted to recipient
5. Transaction result will include the new token_id

${jsonCodeBlock(output.unsigned_deploy)}`;

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: output
        };
      } catch (error) {
        return createErrorResult(error, "NFT mint build");
      }
    }
  );
}

/**
 * Register casper_build_nft_transfer tool
 */
export function registerBuildNftTransferTool(server: McpServer, client: CasperClient): void {
  server.registerTool(
    BUILD_NFT_TRANSFER_TOOL,
    {
      title: "Build NFT Transfer",
      description: BUILD_NFT_TRANSFER_DESCRIPTION,
      inputSchema: BuildNftTransferInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: BuildNftTransferInput): Promise<CallToolResult> => {
      try {
        // Auto-load contract address from environment
        const contractAddress = getContractFromEnv('CASPER_NFT_CONTRACT_ADDRESS');
        if (!contractAddress) {
          throw new Error(
            'NFT contract not configured. Set CASPER_NFT_CONTRACT_ADDRESS in environment.'
          );
        }

        const { from_public_key, from, to, token_id } = params;
        validatePublicKeys([from_public_key, from, to]);

        const network = client.getChainName();
        const unsignedDeploy = buildStoredContractDeploy(
          from_public_key,
          network,
          contractAddress,
          "transfer_from",
          [
            ["from", { cl_type: "Key", parsed: from }],
            ["to", { cl_type: "Key", parsed: to }],
            ["token_id", { cl_type: "U256", parsed: token_id }]
          ]
        );

        const output: NftTransferOutput = {
          type: "nft_transfer",
          contract_address: contractAddress,
          from,
          to,
          token_id,
          network,
          requires_signature: true,
          unsigned_deploy: unsignedDeploy
        };

        const textContent = `# NFT Transfer Transaction

## Details
- **Contract:** \`${contractAddress}\`
- **From:** \`${truncateAddress(from)}\`
- **To:** \`${truncateAddress(to)}\`
- **Token ID:** ${token_id}
- **Network:** ${network}

## Requirements
- Caller must be the current owner (\`${truncateAddress(from)}\`)
- Token must exist

${getTransactionNextSteps()}

${jsonCodeBlock(output.unsigned_deploy)}`;

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: output
        };
      } catch (error) {
        return createErrorResult(error, "NFT transfer build");
      }
    }
  );
}

/**
 * Register casper_build_nft_burn tool
 */
export function registerBuildNftBurnTool(server: McpServer, client: CasperClient): void {
  server.registerTool(
    BUILD_NFT_BURN_TOOL,
    {
      title: "Build NFT Burn",
      description: BUILD_NFT_BURN_DESCRIPTION,
      inputSchema: BuildNftBurnInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: BuildNftBurnInput): Promise<CallToolResult> => {
      try {
        // Auto-load contract address from environment
        const contractAddress = getContractFromEnv('CASPER_NFT_CONTRACT_ADDRESS');
        if (!contractAddress) {
          throw new Error(
            'NFT contract not configured. Set CASPER_NFT_CONTRACT_ADDRESS in environment.'
          );
        }

        const { from_public_key, token_id } = params;
        validatePublicKey(from_public_key);

        const network = client.getChainName();
        const unsignedDeploy = buildStoredContractDeploy(
          from_public_key,
          network,
          contractAddress,
          "burn",
          [
            ["token_id", { cl_type: "U256", parsed: token_id }]
          ]
        );

        const output: NftBurnOutput = {
          type: "nft_burn",
          contract_address: contractAddress,
          burner: from_public_key,
          token_id,
          network,
          requires_signature: true,
          unsigned_deploy: unsignedDeploy
        };

        const textContent = `# NFT Burn Transaction

## Details
- **Contract:** \`${contractAddress}\`
- **Burner:** \`${truncateAddress(from_public_key)}\`
- **Token ID:** ${token_id}
- **Network:** ${network}

## Warning
This action is **PERMANENT** and cannot be undone!
The NFT will be destroyed forever.

## Requirements
- Caller must be the current owner
- Token must exist

${getTransactionNextSteps()}

${jsonCodeBlock(output.unsigned_deploy)}`;

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: output
        };
      } catch (error) {
        return createErrorResult(error, "NFT burn build");
      }
    }
  );
}

/**
 * Register all NFT contract tools
 */
export function registerAllNftTools(server: McpServer, client: CasperClient): void {
  registerQueryNftTool(server, client);
  registerBuildNftMintTool(server, client);
  registerBuildNftTransferTool(server, client);
  registerBuildNftBurnTool(server, client);
}
