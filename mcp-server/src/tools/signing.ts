/**
 * casper_sign_transaction and casper_submit_transaction tools
 *
 * These tools enable transaction signing and submission in stdio mode
 * (Claude Desktop / MCP Studio) using a secret key from environment variables.
 *
 * SECURITY NOTE: These tools are only available when CASPER_SECRET_KEY
 * is set in the environment. The secret key is NEVER passed as a parameter.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

import { z } from "zod";
import type { CallToolResult } from "../types.js";
import { createErrorResult } from "../utils/errors.js";
import {
  loadPrivateKey,
  reconstructTransaction,
  signTransaction,
  transactionToJson,
  getSecretKeyFromEnv,
  getWalletPublicKey,
  getTransactionType,
  type SdkTransactionJson,
  type SignedTransactionResult,
} from "../utils/signing.js";
import { CasperClient } from "../services/casper-client.js";

// ============ Schemas ============

/**
 * Schema for SDK-produced transaction JSON
 * Accepts the format output by Transaction.toJSON() with PascalCase keys
 * Supports all transaction types: Transfer, StoredContractByHash, ModuleBytes
 */
const SignTransactionInputSchema = z.object({
  unsigned_deploy: z.object({
    // Transaction hash (computed by SDK) - OPTIONAL for simplified build tool output
    hash: z.string().optional().describe("The transaction hash computed by SDK"),
    // Header with standard fields
    header: z.object({
      account: z.string().describe("The sender's public key"),
      body_hash: z.string().optional().describe("Hash of the transaction body"),
      chain_name: z.string().describe("The network chain name"),
      dependencies: z.array(z.string()).optional().describe("Transaction dependencies"),
      gas_price: z.number().describe("Gas price multiplier"),
      timestamp: z.string().optional().describe("ISO timestamp"),
      ttl: z.string().describe("Time to live (e.g., '30m')"),
    }),
    // Payment (always module_bytes with snake_case)
    payment: z.object({
      module_bytes: z.object({
        args: z.array(z.tuple([
          z.string(),
          z.object({
            cl_type: z.union([z.string(), z.any()]), // Can be string or complex type like {"Option": "U64"}
            parsed: z.union([z.string(), z.number(), z.boolean()]).optional(),
            bytes: z.string().optional(), // Payment args may have bytes instead of parsed
          }),
        ])),
      }),
    }),
    // Session - one of transfer, stored_contract_by_hash, stored_contract_by_name, or module_bytes
    session: z.object({
      transfer: z.object({
        args: z.array(z.tuple([
          z.string(),
          z.object({
            cl_type: z.union([z.string(), z.any()]), // Can be string or complex type
            parsed: z.union([z.string(), z.number(), z.boolean()]).optional(),
            bytes: z.string().optional(),
          }),
        ])),
      }).optional().describe("Native CSPR transfer"),
      stored_contract_by_hash: z.object({
        hash: z.string(),
        entry_point: z.string(),
        args: z.array(z.tuple([
          z.string(),
          z.object({
            cl_type: z.union([z.string(), z.any()]),
            parsed: z.union([z.string(), z.number(), z.boolean()]).optional(),
            bytes: z.string().optional(),
          }),
        ])),
      }).optional().describe("Contract call by hash"),
      stored_contract_by_name: z.object({
        name: z.string(),
        entry_point: z.string(),
        args: z.array(z.tuple([
          z.string(),
          z.object({
            cl_type: z.union([z.string(), z.any()]),
            parsed: z.union([z.string(), z.number(), z.boolean()]).optional(),
            bytes: z.string().optional(),
          }),
        ])),
      }).optional().describe("Contract call by name (delegation uses this)"),
      module_bytes: z.object({
        module_bytes: z.string(),
        args: z.array(z.tuple([
          z.string(),
          z.object({
            cl_type: z.union([z.string(), z.any()]),
            parsed: z.union([z.string(), z.number(), z.boolean()]).optional(),
            bytes: z.string().optional(),
          }),
        ])),
      }).optional().describe("Contract deployment"),
    }),
    // Approvals array (empty for unsigned transactions) - OPTIONAL for simplified build tool output
    approvals: z.array(z.object({
      signer: z.string(),
      signature: z.string(),
    })).optional().describe("Signatures (empty for unsigned)"),
  }).describe("The unsigned transaction object from a build_* tool"),
});

type SignTransactionInput = z.infer<typeof SignTransactionInputSchema>;

// ============ Output Interfaces ============

interface SignAndSubmitTransactionOutput {
  [key: string]: unknown;
  type: "transaction_submitted";
  transaction_hash: string;
  status: "submitted";
  explorer_url: string;
  signer_public_key: string;
  network: string;
}

// ============ Tool Descriptions ============

const SIGN_TRANSACTION_DESCRIPTION = `Sign and submit a transaction to the Casper network.

**IMPORTANT**: This tool only works when CASPER_SECRET_KEY is set in the
server's environment. It is intended for stdio mode (Claude Desktop / MCP Studio)
where the user trusts the server with their secret key.

For web frontend users, signing should be done via CSPR.click wallet instead.

This tool:
1. Takes an unsigned_deploy from any build_* tool (casper_build_transfer, etc.)
2. Signs it with the secret key from CASPER_SECRET_KEY environment variable
3. Submits the signed transaction to the network
4. Returns the transaction hash and explorer URL

Args:
  - unsigned_deploy (object): The unsigned transaction from a build tool

Returns:
  {
    "type": "transaction_submitted",
    "transaction_hash": string,
    "status": "submitted",
    "explorer_url": string,
    "signer_public_key": string,
    "network": string
  }

Example flow:
1. User: "Send 100 CSPR to 01abc..."
2. AI calls casper_build_transfer -> gets unsigned_deploy
3. AI calls casper_sign_transaction -> signs and submits to network

Error Handling:
  - Returns error if CASPER_SECRET_KEY is not configured
  - Returns error if the unsigned_deploy format is invalid
  - Returns error if signing fails
  - Returns error if network submission fails`;

// ============ Tool Registration ============

/**
 * Register the casper_sign_and_submit_transaction tool
 */
export function registerSignTransactionTool(server: McpServer, client: CasperClient): void {
  server.registerTool(
    "casper_sign_and_submit_transaction",
    {
      title: "Sign and Submit Transaction",
      description: SIGN_TRANSACTION_DESCRIPTION,
      inputSchema: SignTransactionInputSchema,
      annotations: {
        readOnlyHint: false,
        destructiveHint: true, // Submitting is irreversible
        idempotentHint: false, // Can't submit the same transaction twice
        openWorldHint: true, // Interacts with external network
      },
    },
    async (params: SignTransactionInput): Promise<CallToolResult> => {
      try {
        // Check if wallet is configured
        const secretKey = getSecretKeyFromEnv();
        if (!secretKey) {
          throw new Error(
            "Wallet not configured. Set CASPER_SECRET_KEY environment variable to enable signing."
          );
        }

        // Load the private key
        const privateKey = loadPrivateKey(secretKey);
        const signerPublicKey = privateKey.publicKey.toHex();

        // Verify the signer matches the deploy account
        if (params.unsigned_deploy.header.account !== signerPublicKey) {
          throw new Error(
            `Signer mismatch: Deploy is for account ${params.unsigned_deploy.header.account.slice(0, 20)}... ` +
            `but wallet public key is ${signerPublicKey.slice(0, 20)}...`
          );
        }

        // Determine transaction type for display
        const transactionType = getTransactionType(params.unsigned_deploy as SdkTransactionJson);

        // Reconstruct the Transaction object from SDK-produced JSON
        // This works for ALL transaction types (Transfer, StoredContractByHash, ModuleBytes)
        const transaction = reconstructTransaction(params.unsigned_deploy as SdkTransactionJson);

        // Sign the transaction
        const signedTransaction = signTransaction(transaction, privateKey);

        // Submit the signed transaction to the network using SDK's putTransaction method
        const transactionHash = await client.submitTransaction(signedTransaction);
        const network = client.getNetwork();

        // Generate explorer URL
        const explorerBase = network === "testnet"
          ? "https://testnet.cspr.live"
          : "https://cspr.live";
        const explorerUrl = `${explorerBase}/deploy/${transactionHash}`;

        const output: SignAndSubmitTransactionOutput = {
          type: "transaction_submitted",
          transaction_hash: transactionHash,
          status: "submitted",
          explorer_url: explorerUrl,
          signer_public_key: signerPublicKey,
          network,
        };

        const transactionTypeLabel = transactionType === "transfer" ? "Transfer"
          : transactionType === "contract_call" ? "Contract Call"
          : transactionType === "module_bytes" ? "Contract Deployment"
          : "Transaction";

        const textContent = `# ${transactionTypeLabel} Submitted Successfully

## Transaction Details
- **Transaction Hash:** \`${transactionHash}\`
- **Type:** ${transactionTypeLabel}
- **Status:** Submitted to network
- **Signer:** \`${signerPublicKey.slice(0, 20)}...\`
- **Network:** ${network}

## View on Explorer
[${explorerUrl}](${explorerUrl})

## Note
The transaction has been submitted but not yet executed.
Use \`casper_get_deploy_status\` to check execution status.
Execution typically takes 2-3 minutes.`;

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: output,
        };
      } catch (error) {
        return createErrorResult(error, "transaction signing and submission");
      }
    }
  );
}

/**
 * Register the casper_wallet_status tool
 * Reports whether the wallet is configured for signing
 */
export function registerWalletStatusTool(server: McpServer, client: CasperClient): void {
  server.registerTool(
    "casper_wallet_status",
    {
      title: "Check Wallet Configuration",
      description: `Check if a wallet is configured for transaction signing.

Returns information about the current wallet configuration:
- Whether a secret key is configured (CASPER_SECRET_KEY)
- The public key of the configured wallet (if any)
- The network the server is connected to

This is useful before attempting to sign transactions to verify
the wallet is properly set up.

Returns:
  {
    "configured": boolean,
    "public_key": string | null,
    "network": string
  }`,
      inputSchema: z.object({}),
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async (): Promise<CallToolResult> => {
      try {
        const network = client.getNetwork();
        const publicKey = getWalletPublicKey();
        const configured = publicKey !== null;

        const output = {
          configured,
          public_key: publicKey,
          network,
        };

        const textContent = configured
          ? `# Wallet Status: Configured

## Details
- **Public Key:** \`${publicKey?.slice(0, 20)}...${publicKey?.slice(-8)}\`
- **Network:** ${network}
- **Signing:** Enabled

You can use \`casper_sign_transaction\` to sign transactions.`
          : `# Wallet Status: Not Configured

## Details
- **Network:** ${network}
- **Signing:** Disabled

To enable signing, set the \`CASPER_SECRET_KEY\` environment variable
with your secret key in PEM or hex format.

For web users, use CSPR.click wallet for signing instead.`;

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: output,
        };
      } catch (error) {
        return createErrorResult(error, "wallet status check");
      }
    }
  );
}

/**
 * Register all signing-related tools
 */
export function registerSigningTools(server: McpServer, client: CasperClient): void {
  registerSignTransactionTool(server, client);
  registerWalletStatusTool(server, client);
}
