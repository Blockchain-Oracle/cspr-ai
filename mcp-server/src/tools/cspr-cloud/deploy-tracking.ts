/**
 * Deploy Tracking Tools (cspr.cloud)
 *
 * MCP tools for querying deploy status and history using cspr.cloud REST API.
 * Provides transaction tracking and account deploy history.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "../../types.js";
import type { CsprCloudClient } from "../../services/cspr-cloud-client.js";
import { z } from "zod";
import { createErrorResult } from "../../utils/errors.js";

// ============================================================================
// Input Schemas
// ============================================================================

const GetDeployInputSchema = z.object({
  deploy_hash: z
    .string()
    .length(64, "Deploy hash must be 64 characters")
    .regex(/^[0-9a-f]{64}$/i, "Deploy hash must be valid hex")
    .describe("Deploy hash to query (64 character hex string)")
}).strict();

const GetAccountDeploysInputSchema = z.object({
  account_identifier: z
    .string()
    .refine(
      (val) =>
        /^account-hash-[a-f0-9]{64}$/i.test(val) || /^[0-9a-f]{66}$/i.test(val),
      {
        message:
          "Must be either account-hash-<64-hex> or 66-character public key"
      }
    )
    .describe("Account public key (66 chars hex) or account hash (account-hash-<64-hex>)"),
  page: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Page number (default: 1)"),
  page_size: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Results per page (default: 20, max: 100)"),
  order_direction: z
    .enum(["asc", "desc"])
    .optional()
    .describe("Sort direction (default: desc - newest first)")
}).strict();

const GetDeployStatusInputSchema = z.object({
  deploy_hash: z
    .string()
    .length(64)
    .regex(/^[0-9a-f]{64}$/i)
    .describe("Deploy hash to check status")
}).strict();

type GetDeployInput = z.infer<typeof GetDeployInputSchema>;
type GetAccountDeploysInput = z.infer<typeof GetAccountDeploysInputSchema>;
type GetDeployStatusInput = z.infer<typeof GetDeployStatusInputSchema>;

// ============================================================================
// Tool 1: casper_get_deploy
// ============================================================================

export function registerGetDeployTool(
  server: McpServer,
  client: CsprCloudClient
): void {
  server.registerTool(
    "casper_get_deploy",
    {
      title: "Get Deploy Details",
      description: `Get detailed information about a Casper Network deploy by hash.

Returns deploy execution results, cost, error messages (if failed), and full transaction details.

**Use Cases:**
- Check if transaction succeeded or failed
- Get transaction execution cost
- View deploy arguments and entry point called
- Debug failed transactions with error messages

**Example:**
\`\`\`json
{
  "deploy_hash": "abc123def456...789"
}
\`\`\`

**Returns:**
- Deploy status (pending/processed/expired)
- Execution cost and gas consumed
- Error message if failed
- Block hash and height
- Contract called (if applicable)
- Deploy arguments`,
      inputSchema: GetDeployInputSchema
    },
    async (params: GetDeployInput): Promise<CallToolResult> => {
      try {
        const deploy = await client.getDeploy(params.deploy_hash);

        // Format response
        const status = deploy.error_message ? "failed" : "success";
        const textContent = `# Deploy Status: ${status.toUpperCase()}

**Deploy Hash:** ${deploy.deploy_hash}
**Block:** ${deploy.block_height} (${deploy.block_hash})
**Caller:** ${deploy.caller_public_key || deploy.caller_hash}
**Timestamp:** ${deploy.timestamp}

## Execution Results

**Status:** ${status}
**Cost:** ${Number(deploy.cost) / 1e9} CSPR
**Gas Consumed:** ${deploy.consumed_gas}
**Gas Refunded:** ${Number(deploy.refund_amount) / 1e9} CSPR

${deploy.error_message ? `## Error\n\n\`\`\`\n${deploy.error_message}\n\`\`\`\n` : ""}

${deploy.contract_package_hash ? `## Contract Called\n\n**Package Hash:** ${deploy.contract_package_hash}\n**Contract Hash:** ${deploy.contract_hash}\n**Entry Point ID:** ${deploy.entry_point_id}\n` : ""}

## Deploy Arguments

\`\`\`json
${JSON.stringify(deploy.args, null, 2)}
\`\`\`

${deploy.payment_amount ? `**Payment Amount:** ${Number(deploy.payment_amount) / 1e9} CSPR` : "Custom payment"}

---

View on Explorer: https://${client.getNetwork() === "testnet" ? "testnet." : ""}cspr.live/deploy/${deploy.deploy_hash}`;

        return {
          content: [
            {
              type: "text",
              text: textContent
            }
          ],
          structuredContent: {
            deploy_hash: deploy.deploy_hash,
            status,
            block_height: deploy.block_height,
            block_hash: deploy.block_hash,
            caller: deploy.caller_public_key || deploy.caller_hash,
            cost_cspr: Number(deploy.cost) / 1e9,
            consumed_gas: deploy.consumed_gas,
            error_message: deploy.error_message,
            timestamp: deploy.timestamp,
            contract_package_hash: deploy.contract_package_hash,
            contract_hash: deploy.contract_hash,
            entry_point_id: deploy.entry_point_id,
            args: deploy.args
          }
        };
      } catch (error) {
        return createErrorResult(error, "deploy query");
      }
    }
  );
}

// ============================================================================
// Tool 2: casper_get_account_deploys
// ============================================================================

export function registerGetAccountDeploysTool(
  server: McpServer,
  client: CsprCloudClient
): void {
  server.registerTool(
    "casper_get_account_deploys",
    {
      title: "Get Account Deploy History",
      description: `Get all deploys (transactions) for a Casper Network account.

Returns paginated list of all transactions submitted by the account, including transfers, contract calls, and delegations.

**Use Cases:**
- View account transaction history
- Track recent activity
- Audit account operations
- Find specific past transactions

**Example:**
\`\`\`json
{
  "account_identifier": "01abc123...",
  "page": 1,
  "page_size": 20
}
\`\`\`

**Returns:**
- List of deploys with status
- Deploy hashes for detailed queries
- Block heights and timestamps
- Execution costs
- Pagination info (total pages, item count)`,
      inputSchema: GetAccountDeploysInputSchema
    },
    async (params: GetAccountDeploysInput): Promise<CallToolResult> => {
      try {
        const { account_identifier, ...queryParams } = params;
        const result = await client.getAccountDeploys(account_identifier, queryParams);

        // Format deploys list
        const deploysList = result.data
          .map((deploy, index) => {
            const status = deploy.error_message ? "❌ FAILED" : "✅ SUCCESS";
            const cost = Number(deploy.cost) / 1e9;
            return `${index + 1}. **${status}** | Block ${deploy.block_height} | ${cost.toFixed(2)} CSPR
   Hash: \`${deploy.deploy_hash}\`
   Time: ${new Date(deploy.timestamp).toLocaleString()}
   ${deploy.error_message ? `Error: ${deploy.error_message}` : ""}`;
          })
          .join("\n\n");

        const textContent = `# Account Deploy History

**Account:** ${account_identifier}
**Total Deploys:** ${result.item_count}
**Page:** ${params.page || 1} of ${result.page_count}
**Results:** ${result.data.length} deploys

---

${deploysList}

---

**Tip:** Use \`casper_get_deploy\` with a specific deploy hash to get full details.`;

        return {
          content: [
            {
              type: "text",
              text: textContent
            }
          ],
          structuredContent: {
            account: account_identifier,
            total_count: result.item_count,
            page_count: result.page_count,
            current_page: params.page || 1,
            deploys: result.data.map((d) => ({
              deploy_hash: d.deploy_hash,
              status: d.error_message ? "failed" : "success",
              block_height: d.block_height,
              cost_cspr: Number(d.cost) / 1e9,
              timestamp: d.timestamp,
              error: d.error_message
            }))
          }
        };
      } catch (error) {
        return createErrorResult(error, "account deploys query");
      }
    }
  );
}

// ============================================================================
// Tool 3: casper_check_deploy_status (quick status via cspr.cloud)
// ============================================================================

export function registerCheckDeployStatusTool(
  server: McpServer,
  client: CsprCloudClient
): void {
  server.registerTool(
    "casper_check_deploy_status",
    {
      title: "Quick Deploy Status Check",
      description: `Quick status check for a deploy - did it succeed or fail?

Returns simplified deploy status for quick verification after submitting transactions.

**Use Cases:**
- Verify transaction succeeded after submission
- Check if deploy is still pending
- Get quick failure reason
- Monitor transaction progress

**Example:**
\`\`\`json
{
  "deploy_hash": "abc123def456...789"
}
\`\`\`

**Returns:**
- Simple status (success/failed/pending)
- Error message if failed
- Execution cost
- Block confirmation`,
      inputSchema: GetDeployStatusInputSchema
    },
    async (params: GetDeployStatusInput): Promise<CallToolResult> => {
      try {
        const deploy = await client.getDeploy(params.deploy_hash);

        const status = deploy.status === "pending"
          ? "pending"
          : deploy.error_message
          ? "failed"
          : "success";

        const statusEmoji = status === "success" ? "✅" : status === "failed" ? "❌" : "⏳";
        const costCspr = Number(deploy.cost) / 1e9;

        const textContent = `# Deploy Status: ${statusEmoji} ${status.toUpperCase()}

**Deploy Hash:** ${deploy.deploy_hash}

${status === "pending" ? "**Status:** Pending execution...\n" : `**Block:** ${deploy.block_height}\n**Cost:** ${costCspr.toFixed(2)} CSPR\n`}

${deploy.error_message ? `## ❌ Error\n\n\`\`\`\n${deploy.error_message}\n\`\`\`\n\n**What this means:** The transaction was included in a block but execution failed. The gas cost was still charged.` : ""}

${status === "success" ? "✅ **Transaction executed successfully!**" : ""}

---

Explorer: https://${client.getNetwork() === "testnet" ? "testnet." : ""}cspr.live/deploy/${deploy.deploy_hash}`;

        return {
          content: [
            {
              type: "text",
              text: textContent
            }
          ],
          structuredContent: {
            deploy_hash: deploy.deploy_hash,
            status,
            block_height: deploy.block_height,
            cost_cspr: costCspr,
            error_message: deploy.error_message,
            explorer_url: `https://${client.getNetwork() === "testnet" ? "testnet." : ""}cspr.live/deploy/${deploy.deploy_hash}`
          }
        };
      } catch (error) {
        return createErrorResult(error, "deploy status check");
      }
    }
  );
}

// ============================================================================
// Export all registration functions
// ============================================================================

export function registerAllDeployTrackingTools(
  server: McpServer,
  client: CsprCloudClient
): void {
  registerGetDeployTool(server, client);
  registerGetAccountDeploysTool(server, client);
  registerCheckDeployStatusTool(server, client);
}
