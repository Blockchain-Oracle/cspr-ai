/**
 * casper_get_deploy_status tool
 *
 * Check the status of a Casper deploy (transaction).
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { GetDeployStatusInputSchema } from "../schemas/index.js";
import { ResponseFormat, MOTES_PER_CSPR } from "../constants.js";
import { CasperClient } from "../services/casper-client.js";
import { createErrorResult } from "../utils/errors.js";
import type { GetDeployStatusInput, DeployStatusOutput, CallToolResult } from "../types.js";

const TOOL_NAME = "casper_get_deploy_status";

const TOOL_DESCRIPTION = `Check the status of a Casper deploy (transaction).

This tool retrieves information about a specific deploy, including
whether it succeeded, failed, or is still pending.

Args:
  - deploy_hash (string): The deploy hash to query (64 hex characters)
  - response_format ('markdown' | 'json'): Output format (default: 'markdown')

Returns:
  For JSON format:
  {
    "deploy_hash": string,
    "status": "success" | "failed" | "pending",
    "block_hash": string | null,
    "cost_cspr": string,
    "timestamp": string,
    "error_message": string | null
  }

Examples:
  - Use when: "Check if my transaction went through" -> query with deploy hash
  - Use when: "What happened to deploy abc123..." -> query status
  - Don't use when: You only have a block hash (use block query instead)

Error Handling:
  - Returns "Deploy not found" if hash is invalid or deploy doesn't exist
  - May return "pending" if deploy hasn't been processed yet`;

/**
 * Register the casper_get_deploy_status tool with the MCP server
 */
export function registerDeployTool(server: McpServer, client: CasperClient): void {
  server.registerTool(
    TOOL_NAME,
    {
      title: "Get Deploy Status",
      description: TOOL_DESCRIPTION,
      inputSchema: GetDeployStatusInputSchema,
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: true
      }
    },
    async (params: GetDeployStatusInput): Promise<CallToolResult> => {
      try {
        const result = await client.getDeploy(params.deploy_hash);

        const executionResults = result.execution_results || [];
        const hasResults = executionResults.length > 0;
        const firstResult = executionResults[0];

        let status: "success" | "failed" | "pending" = "pending";
        let errorMessage: string | null = null;
        let costCspr = "0";

        if (hasResults) {
          if (firstResult.result?.Success) {
            status = "success";
            const cost = firstResult.result.Success.cost || "0";
            costCspr = (BigInt(cost) / MOTES_PER_CSPR).toString();
          } else if (firstResult.result?.Failure) {
            status = "failed";
            errorMessage = firstResult.result.Failure.error_message || "Unknown error";
            const cost = firstResult.result.Failure.cost || "0";
            costCspr = (BigInt(cost) / MOTES_PER_CSPR).toString();
          }
        }

        const output: DeployStatusOutput = {
          deploy_hash: params.deploy_hash,
          status,
          block_hash: firstResult?.block_hash || null,
          cost_cspr: costCspr,
          timestamp: result.deploy?.header?.timestamp || null,
          error_message: errorMessage
        };

        let textContent: string;
        if (params.response_format === ResponseFormat.MARKDOWN) {
          const statusEmoji = status === "success" ? "✅" : status === "failed" ? "❌" : "⏳";
          const lines = [
            `# Deploy Status`,
            ``,
            `**Hash:** \`${params.deploy_hash.slice(0, 16)}...\``,
            `**Status:** ${statusEmoji} ${status.toUpperCase()}`,
            `**Cost:** ${costCspr} CSPR`
          ];

          if (output.block_hash) {
            lines.push(`**Block:** \`${output.block_hash.slice(0, 16)}...\``);
          }
          if (output.timestamp) {
            lines.push(`**Timestamp:** ${output.timestamp}`);
          }
          if (errorMessage) {
            lines.push(``, `## Error`, `\`\`\``, errorMessage, `\`\`\``);
          }

          textContent = lines.join("\n");
        } else {
          textContent = JSON.stringify(output, null, 2);
        }

        return {
          content: [{ type: "text", text: textContent }],
          structuredContent: output
        };
      } catch (error) {
        return createErrorResult(error, "deploy status query");
      }
    }
  );
}
