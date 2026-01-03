/**
 * Transfer History Tools (cspr.cloud)
 *
 * MCP tools for querying native CSPR transfer history using cspr.cloud REST API.
 * Provides account-level transfer tracking for native token movements.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "../../types.js";
import type { CsprCloudClient } from "../../services/cspr-cloud-client.js";
import { z } from "zod";
import { createErrorResult } from "../../utils/errors.js";

// ============================================================================
// Input Schemas
// ============================================================================

const GetAccountTransfersInputSchema = z.object({
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

type GetAccountTransfersInput = z.infer<typeof GetAccountTransfersInputSchema>;

// ============================================================================
// Tool: casper_get_account_transfers
// ============================================================================

export function registerGetAccountTransfersTool(
  server: McpServer,
  client: CsprCloudClient
): void {
  server.registerTool(
    "casper_get_account_transfers",
    {
      title: "Get Account Native CSPR Transfers",
      description: `Get native CSPR transfer history for a Casper Network account.

Returns all direct CSPR transfers involving the account (as initiator or recipient).

**Use Cases:**
- View account's CSPR transaction history
- Track native token transfers
- Monitor account balance changes
- Audit CSPR movements

**Example:**
\`\`\`json
{
  "account_identifier": "01abc123...",
  "page": 1,
  "page_size": 20
}
\`\`\`

**Returns:**
- Transfer amounts in CSPR
- Initiator and recipient addresses
- Deploy hashes for verification
- Transfer IDs (unique per transfer)
- Block heights and timestamps
- Direction (sent/received)
- Pagination info`,
      inputSchema: GetAccountTransfersInputSchema
    },
    async (params: GetAccountTransfersInput): Promise<CallToolResult> => {
      try {
        const { account_identifier, ...queryParams } = params;
        const result = await client.getAccountTransfers(account_identifier, queryParams);

        if (result.data.length === 0) {
          const textContent = `# Account Native CSPR Transfers

**Account:** ${account_identifier}
**Total Transfers:** 0

---

No native CSPR transfers found for this account.

**Note:** This only shows direct CSPR transfers. Use \`casper_get_account_token_actions\` to see CEP-18 token transfers.`;

          return {
            content: [
              {
                type: "text",
                text: textContent
              }
            ],
            structuredContent: {
              account: account_identifier,
              total_count: 0,
              transfers: []
            }
          };
        }

        // Format transfers list
        const transfersList = result.data
          .map((transfer, index) => {
            const amount = Number(transfer.amount || 0) / 1e9;
            const isInitiator = transfer.initiator_account_hash === account_identifier;
            const direction = isInitiator ? "➡️ SENT" : "⬅️ RECEIVED";
            const counterparty = isInitiator ? transfer.to_account_hash : transfer.initiator_account_hash;

            return `${index + 1}. ${direction} | ${amount.toFixed(2)} CSPR
   ${isInitiator ? "To:" : "From:"} ${counterparty}
   Transfer ID: ${transfer.id}
   Deploy: \`${transfer.deploy_hash}\`
   Block: ${transfer.block_height}
   Time: ${new Date(transfer.timestamp).toLocaleString()}`;
          })
          .join("\n\n");

        // Calculate totals for this page
        const totalSent = result.data
          .filter((t) => t.initiator_account_hash === account_identifier)
          .reduce((sum, t) => sum + Number(t.amount || 0), 0) / 1e9;

        const totalReceived = result.data
          .filter((t) => t.to_account_hash === account_identifier)
          .reduce((sum, t) => sum + Number(t.amount || 0), 0) / 1e9;

        const textContent = `# Account Native CSPR Transfers

**Account:** ${account_identifier}
**Total Transfers:** ${result.item_count}
**Page:** ${params.page || 1} of ${result.page_count}
**Results:** ${result.data.length} transfers

## Page Summary
- **Sent:** ${totalSent.toFixed(2)} CSPR
- **Received:** ${totalReceived.toFixed(2)} CSPR
- **Net:** ${(totalReceived - totalSent).toFixed(2)} CSPR

---

${transfersList}

---

**Note:** This only shows native CSPR transfers. For token transfers, use \`casper_get_account_token_actions\`.

**Tip:** Use \`casper_get_deploy\` with a deploy hash to see full transaction details including gas costs.`;

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
            page_summary: {
              total_sent_cspr: totalSent,
              total_received_cspr: totalReceived,
              net_cspr: totalReceived - totalSent
            },
            transfers: result.data.map((t) => ({
              transfer_id: t.id,
              direction: t.initiator_account_hash === account_identifier ? "sent" : "received",
              initiator_account_hash: t.initiator_account_hash,
              to_account_hash: t.to_account_hash,
              amount_cspr: Number(t.amount || 0) / 1e9,
              deploy_hash: t.deploy_hash,
              block_height: t.block_height,
              timestamp: t.timestamp
            }))
          }
        };
      } catch (error) {
        return createErrorResult(error, "account transfers query");
      }
    }
  );
}

// ============================================================================
// Export all registration functions
// ============================================================================

export function registerAllTransferTools(
  server: McpServer,
  client: CsprCloudClient
): void {
  registerGetAccountTransfersTool(server, client);
}
