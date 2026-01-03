/**
 * casper_get_balance tool
 *
 * Query the CSPR balance for a Casper Network account.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GetBalanceInputSchema } from "../schemas/index.js";
import { ResponseFormat } from "../constants.js";
import { CasperClient } from "../services/casper-client.js";
import { createErrorResult } from "../utils/errors.js";
import type { GetBalanceInput, BalanceOutput, CallToolResult } from "../types.js";

const TOOL_NAME = "casper_get_balance";

const TOOL_DESCRIPTION = `Query the CSPR balance for a Casper Network account.

This tool retrieves the current balance of a Casper account using its public key.
Returns both the balance in CSPR and the raw balance in motes (1 CSPR = 1 billion motes).

Args:
  - public_key (string): Casper public key starting with 01 (Ed25519) or 02 (Secp256k1)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  For JSON format:
  {
    "public_key": string,
    "balance_cspr": string,
    "balance_motes": string,
    "network": string
  }

Examples:
  - Use when: "What's the balance of account 01abc..." -> query with that public key
  - Use when: "Check if this wallet has funds" -> query balance
  - Don't use when: You need transaction history (use a block explorer instead)

Error Handling:
  - Returns "Invalid public key format" if key format is wrong
  - Returns "Account not found" if the account doesn't exist on the network`;

/**
 * Register the casper_get_balance tool with the MCP server
 */
export function registerBalanceTool(server: McpServer, client: CasperClient): void {
  server.registerTool(
    TOOL_NAME,
    {
      title: "Get Casper Balance",
      description: TOOL_DESCRIPTION,
      inputSchema: GetBalanceInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: GetBalanceInput): Promise<CallToolResult> => {
      try {
        const result = await client.getBalance(params.public_key);

        const output: BalanceOutput = {
          public_key: params.public_key,
          balance_cspr: result.balance,
          balance_motes: result.balanceMotes,
          network: client.getNetwork()
        };

        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          textContent = `# Casper Account Balance

**Public Key:** \`${params.public_key.slice(0, 20)}...${params.public_key.slice(-8)}\`
**Balance:** ${result.balance} CSPR
**Balance (motes):** ${result.balanceMotes}
**Network:** ${output.network}`;
        } else {
          textContent = JSON.stringify(output, null, 2);
        }

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: output
        };
      } catch (error) {
        return createErrorResult(error, "balance query");
      }
    }
  );
}
