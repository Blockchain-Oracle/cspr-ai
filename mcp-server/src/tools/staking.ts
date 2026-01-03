/**
 * casper_get_staking_info tool
 *
 * Get staking/delegation information for a Casper account.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GetStakingInfoInputSchema } from "../schemas/index.js";
import { ResponseFormat } from "../constants.js";
import { CasperClient } from "../services/casper-client.js";
import { createErrorResult } from "../utils/errors.js";
import type { GetStakingInfoInput, StakingInfoOutput, CallToolResult } from "../types.js";

const TOOL_NAME = "casper_get_staking_info";

const TOOL_DESCRIPTION = `Get staking/delegation information for a Casper account.

This tool retrieves all delegations made by a specific account,
showing which validators they've staked with and how much.

Args:
  - public_key (string): Delegator's Casper public key
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  For JSON format:
  {
    "delegator": string,
    "delegations": [
      {
        "validator_public_key": string,
        "staked_amount_cspr": string
      }
    ],
    "total_staked_cspr": string
  }

Examples:
  - Use when: "How much am I staking?" -> query with user's public key
  - Use when: "Show my delegations" -> query staking info
  - Don't use when: You need staking rewards (not directly available)

Error Handling:
  - Returns empty delegations if account has no active stakes
  - Returns error if public key is invalid`;

/**
 * Register the casper_get_staking_info tool with the MCP server
 */
export function registerStakingTool(server: McpServer, client: CasperClient): void {
  server.registerTool(
    TOOL_NAME,
    {
      title: "Get Staking Info",
      description: TOOL_DESCRIPTION,
      inputSchema: GetStakingInfoInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: GetStakingInfoInput): Promise<CallToolResult> => {
      try {
        const { delegations, totalStaked } = await client.getStakingInfo(params.public_key);

        const output: StakingInfoOutput = {
          delegator: params.public_key,
          delegations: delegations.map(d => ({
            validator_public_key: d.validator_public_key,
            staked_amount_cspr: d.staked_amount_cspr
          })),
          total_staked_cspr: totalStaked
        };

        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          if (delegations.length === 0) {
            textContent = `# Staking Info

**Account:** \`${params.public_key.slice(0, 20)}...\`

No active delegations found for this account.`;
          } else {
            const lines = [
              `# Staking Info`,
              ``,
              `**Account:** \`${params.public_key.slice(0, 20)}...\``,
              `**Total Staked:** ${totalStaked} CSPR`,
              ``,
              `## Delegations`
            ];

            for (const d of delegations) {
              lines.push(`- **${d.validator_public_key.slice(0, 16)}...**: ${d.staked_amount_cspr} CSPR`);
            }

            textContent = lines.join("\n");
          }
        } else {
          textContent = JSON.stringify(output, null, 2);
        }

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: output
        };
      } catch (error) {
        return createErrorResult(error, "staking info query");
      }
    }
  );
}
