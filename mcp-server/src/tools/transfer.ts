/**
 * casper_build_transfer tool
 *
 * Build an unsigned CSPR transfer transaction.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// Fix for ESM/CommonJS interop
import casperSdk from "casper-js-sdk";
const { PublicKey } = casperSdk;
import { TransferCsprInputSchema } from "../schemas/index.js";
import {
  DEPLOY_TTL,
  GAS_PRICE,
  TRANSFER_PAYMENT_BYTES
} from "../constants.js";
import { CasperClient } from "../services/casper-client.js";
import { createErrorResult } from "../utils/errors.js";
import { csprToMotes } from "../utils/currency.js";
import type { TransferCsprInput, TransferOutput, CallToolResult } from "../types.js";

const TOOL_NAME = "casper_build_transfer";

const TOOL_DESCRIPTION = `Build an unsigned CSPR transfer transaction.

This tool creates an unsigned transfer transaction that can be signed
by the user's wallet (CSPR.click) and submitted to the network.
The tool does NOT sign or submit the transaction - it only builds it.

Args:
  - from_public_key (string): Sender's Casper public key
  - to_public_key (string): Recipient's Casper public key
  - amount_cspr (number): Amount to transfer in CSPR (e.g., 100.5)

Returns:
  For JSON format:
  {
    "type": "transfer",
    "from": string,
    "to": string,
    "amount_cspr": number,
    "amount_motes": string,
    "memo": string | null,
    "network": string,
    "requires_signature": true,
    "unsigned_deploy": object
  }

Examples:
  - Use when: "Send 100 CSPR to 01abc..." -> build transfer
  - Use when: "Transfer funds to this wallet" -> build transfer
  - Don't use when: You want to check balance first (use casper_get_balance)

IMPORTANT: This returns an UNSIGNED transaction. The user must sign it
with their wallet before it can be submitted to the network.

Error Handling:
  - Returns error if either public key is invalid
  - Returns error if amount is not positive
  - Returns error if from_public_key equals to_public_key (self-transfers not allowed on Casper 2.0)`;

/**
 * Register the casper_build_transfer tool with the MCP server
 */
export function registerTransferTool(server: McpServer, client: CasperClient): void {
  server.registerTool(
    TOOL_NAME,
    {
      title: "Build CSPR Transfer",
      description: TOOL_DESCRIPTION,
      inputSchema: TransferCsprInputSchema,
      annotations: {
        readOnlyHint: false,  // Creates transaction object
        destructiveHint: false,  // Doesn't actually transfer
        idempotentHint: true,  // Same inputs = same outputs
        openWorldHint: false
      }
    },
    async (params: TransferCsprInput): Promise<CallToolResult> => {
      try {
        // Validate public keys by trying to parse them
        PublicKey.fromHex(params.from_public_key);
        PublicKey.fromHex(params.to_public_key);

        // Validate that this is not a self-transfer
        if (params.from_public_key === params.to_public_key) {
          throw new Error(
            "Self-transfer not allowed. The sender and recipient public keys must be different."
          );
        }

        // Convert CSPR to motes using precision-safe conversion
        const amountMotes = csprToMotes(params.amount_cspr);
        const network = client.getChainName();

        const output: TransferOutput = {
          type: "transfer",
          from: params.from_public_key,
          to: params.to_public_key,
          amount_cspr: params.amount_cspr,
          amount_motes: amountMotes,
          network,
          requires_signature: true,
          unsigned_deploy: {
            header: {
              account: params.from_public_key,
              chain_name: network,
              gas_price: GAS_PRICE,
              ttl: DEPLOY_TTL
            },
            payment: {
              module_bytes: {
                args: [["amount", { cl_type: "U512", bytes: TRANSFER_PAYMENT_BYTES }]]
              }
            },
            session: {
              transfer: {
                args: [
                  ["amount", { cl_type: "U512", parsed: amountMotes }],
                  ["target", { cl_type: "PublicKey", parsed: params.to_public_key }]
                ]
              }
            }
          }
        };

        const textContent = `# CSPR Transfer Transaction

## Details
- **From:** \`${params.from_public_key.slice(0, 20)}...\`
- **To:** \`${params.to_public_key.slice(0, 20)}...\`
- **Amount:** ${params.amount_cspr} CSPR (${amountMotes} motes)
- **Network:** ${network}

## Next Steps
1. This is an **unsigned transaction**
2. Use CSPR.click or another wallet to sign this transaction
3. Submit the signed transaction to the network

\`\`\`json
${JSON.stringify(output.unsigned_deploy, null, 2)}
\`\`\``;

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: output
        };
      } catch (error) {
        return createErrorResult(error, "transfer build");
      }
    }
  );
}
