/**
 * casper_build_delegation tool
 *
 * Build an unsigned stake delegation transaction.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
// Fix for ESM/CommonJS interop
import casperSdk from "casper-js-sdk";
const { PublicKey } = casperSdk;
import { DelegateStakeInputSchema } from "../schemas/index.js";
import {
  DEPLOY_TTL,
  GAS_PRICE,
  DELEGATION_PAYMENT_BYTES
} from "../constants.js";
import { CasperClient } from "../services/casper-client.js";
import { createErrorResult } from "../utils/errors.js";
import { csprToMotes } from "../utils/currency.js";
import type { DelegateStakeInput, DelegationBuildOutput, CallToolResult } from "../types.js";

const TOOL_NAME = "casper_build_delegation";

const TOOL_DESCRIPTION = `Build an unsigned stake delegation transaction.

This tool creates an unsigned delegation transaction for staking CSPR
with a validator. The transaction must be signed by the user's wallet
before it can be submitted.

Args:
  - delegator_public_key (string): Your Casper public key
  - validator_public_key (string): Validator's public key to delegate to
  - amount_cspr (number): Amount to stake in CSPR (minimum 500)

Returns:
  For JSON format:
  {
    "type": "delegate",
    "delegator": string,
    "validator": string,
    "amount_cspr": number,
    "amount_motes": string,
    "network": string,
    "requires_signature": true,
    "unsigned_deploy": object
  }

Examples:
  - Use when: "Stake 500 CSPR with validator 01xyz..." -> build delegation
  - Use when: "Delegate my tokens" -> build delegation (ask for validator first)
  - Don't use when: You want to see validators first (use casper_get_validators)

IMPORTANT: Minimum delegation is 500 CSPR. This returns an UNSIGNED
transaction that must be signed with the user's wallet.

Error Handling:
  - Returns error if amount is less than 500 CSPR
  - Returns error if public keys are invalid`;

/**
 * Register the casper_build_delegation tool with the MCP server
 */
export function registerDelegationTool(server: McpServer, client: CasperClient): void {
  server.registerTool(
    TOOL_NAME,
    {
      title: "Build Stake Delegation",
      description: TOOL_DESCRIPTION,
      inputSchema: DelegateStakeInputSchema,
      annotations: {
        readOnlyHint: false,  // Creates transaction object
        destructiveHint: false,  // Doesn't actually stake
        idempotentHint: true,
        openWorldHint: false
      }
    },
    async (params: DelegateStakeInput): Promise<CallToolResult> => {
      try {
        // Validate public keys
        PublicKey.fromHex(params.delegator_public_key);
        PublicKey.fromHex(params.validator_public_key);

        // Convert CSPR to motes using precision-safe conversion
        const amountMotes = csprToMotes(params.amount_cspr);
        const network = client.getChainName();

        const output: DelegationBuildOutput = {
          type: "delegate",
          delegator: params.delegator_public_key,
          validator: params.validator_public_key,
          amount_cspr: params.amount_cspr,
          amount_motes: amountMotes,
          network,
          requires_signature: true,
          unsigned_deploy: {
            header: {
              account: params.delegator_public_key,
              chain_name: network,
              gas_price: GAS_PRICE,
              ttl: DEPLOY_TTL
            },
            payment: {
              module_bytes: {
                args: [["amount", { cl_type: "U512", bytes: DELEGATION_PAYMENT_BYTES }]]
              }
            },
            session: {
              stored_contract_by_name: {
                name: "auction",
                entry_point: "delegate",
                args: [
                  ["delegator", { cl_type: "PublicKey", parsed: params.delegator_public_key }],
                  ["validator", { cl_type: "PublicKey", parsed: params.validator_public_key }],
                  ["amount", { cl_type: "U512", parsed: amountMotes }]
                ]
              }
            }
          }
        };

        const textContent = `# Stake Delegation Transaction

## Details
- **Delegator:** \`${params.delegator_public_key.slice(0, 20)}...\`
- **Validator:** \`${params.validator_public_key.slice(0, 20)}...\`
- **Amount:** ${params.amount_cspr} CSPR (${amountMotes} motes)
- **Network:** ${network}

## Next Steps
1. This is an **unsigned transaction**
2. Use CSPR.click or another wallet to sign this transaction
3. Submit the signed transaction to the network
4. Stake will be active after the next era (~2 hours)

\`\`\`json
${JSON.stringify(output.unsigned_deploy, null, 2)}
\`\`\``;

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: output
        };
      } catch (error) {
        return createErrorResult(error, "delegation build");
      }
    }
  );
}
