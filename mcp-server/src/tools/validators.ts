/**
 * casper_get_validators tool
 *
 * List active validators on the Casper Network with their stakes.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GetValidatorsInputSchema } from "../schemas/index.js";
import { ResponseFormat, CHARACTER_LIMIT } from "../constants.js";
import { CasperClient } from "../services/casper-client.js";
import { createErrorResult } from "../utils/errors.js";
import type { GetValidatorsInput, ValidatorsOutput, CallToolResult } from "../types.js";

const TOOL_NAME = "casper_get_validators";

const TOOL_DESCRIPTION = `List active validators on the Casper Network with their stakes.

This tool retrieves the current list of validators from the auction contract,
showing their public keys, total stake, and delegation rates.

Args:
  - limit (number): Maximum validators to return, 1-100 (default: 20)
  - offset (number): Number of validators to skip for pagination (default: 0)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  For JSON format:
  {
    "validators": [
      {
        "public_key": string,
        "total_stake_cspr": string,
        "delegation_rate": number,
        "delegator_count": number
      }
    ],
    "total_count": number,
    "has_more": boolean,
    "next_offset": number
  }

Examples:
  - Use when: "Show me the top validators" -> list with default params
  - Use when: "Find validators for staking" -> list validators sorted by stake
  - Don't use when: You need historical validator performance (not available)

Error Handling:
  - Returns empty list if no validators found
  - Returns timeout error if auction query takes too long`;

/**
 * Register the casper_get_validators tool with the MCP server
 */
export function registerValidatorsTool(server: McpServer, client: CasperClient): void {
  server.registerTool(
    TOOL_NAME,
    {
      title: "Get Casper Validators",
      description: TOOL_DESCRIPTION,
      inputSchema: GetValidatorsInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: GetValidatorsInput): Promise<CallToolResult> => {
      try {
        const allValidators = await client.getValidators();

        if (allValidators.length === 0) {
          return {
            content: [{ type: "text", text: "No validators found in the current era." }]
          };
        }

        // Apply pagination
        const start = params.offset;
        const end = start + params.limit;
        const validators = allValidators.slice(start, end);
        const hasMore = end < allValidators.length;

        const output: ValidatorsOutput = {
          validators: validators.map(v => ({
            public_key: v.public_key,
            total_stake_cspr: v.total_stake_cspr,
            delegation_rate: v.delegation_rate,
            delegator_count: v.delegator_count
          })),
          total_count: allValidators.length,
          offset: params.offset,
          count: validators.length,
          has_more: hasMore,
          next_offset: hasMore ? end : undefined
        };

        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          const lines = [
            `# Casper Network Validators`,
            ``,
            `Showing ${validators.length} of ${allValidators.length} validators`,
            ``
          ];

          for (const v of validators) {
            lines.push(`## ${v.public_key.slice(0, 16)}...`);
            lines.push(`- **Stake:** ${v.total_stake_cspr} CSPR`);
            lines.push(`- **Delegation Rate:** ${v.delegation_rate}%`);
            lines.push(`- **Delegators:** ${v.delegator_count}`);
            lines.push(``);
          }

          if (hasMore) {
            lines.push(`_More validators available. Use offset=${end} to see next page._`);
          }

          textContent = lines.join("\n");

          // Truncate if too long
          if (textContent.length > CHARACTER_LIMIT) {
            textContent = textContent.slice(0, CHARACTER_LIMIT) +
              "\n\n_Response truncated. Use smaller limit or pagination._";
          }
        } else {
          textContent = JSON.stringify(output, null, 2);
        }

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: output
        };
      } catch (error) {
        return createErrorResult(error, "validators query");
      }
    }
  );
}
