/**
 * Validator Tools (cspr.cloud)
 *
 * MCP tools for querying Casper Network validators, staking data, and auction metrics
 * using cspr.cloud REST API. Provides validator performance tracking and delegation info.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CallToolResult } from "../../types.js";
import type { CsprCloudClient } from "../../services/cspr-cloud-client.js";
import { z } from "zod";
import { createErrorResult } from "../../utils/errors.js";
import { calculateBlockDeployCount } from "./utils.js";

// ============================================================================
// Input Schemas
// ============================================================================

const GetCurrentValidatorsInputSchema = z.object({
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
    .describe("Sort direction (default: desc)")
}).strict();

const GetValidatorRewardsInputSchema = z.object({
  validator_public_key: z
    .string()
    .min(66, "Validator public key must be at least 66 characters")
    .max(68, "Validator public key must be at most 68 characters")
    .regex(/^(01[0-9a-f]{64}|02[0-9a-f]{66})$/i, "Validator public key must be Ed25519 (01+64hex) or Secp256k1 (02+66hex)")
    .describe("Validator public key (Ed25519: 66 chars, Secp256k1: 68 chars)"),
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

const GetValidatorBlocksInputSchema = z.object({
  validator_public_key: z
    .string()
    .min(66, "Validator public key must be at least 66 characters")
    .max(68, "Validator public key must be at most 68 characters")
    .regex(/^(01[0-9a-f]{64}|02[0-9a-f]{66})$/i, "Validator public key must be Ed25519 (01+64hex) or Secp256k1 (02+66hex)")
    .describe("Validator public key (Ed25519: 66 chars, Secp256k1: 68 chars)"),
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
    .describe("Results per page (default: 20, max: 100)")
}).strict();

type GetCurrentValidatorsInput = z.infer<typeof GetCurrentValidatorsInputSchema>;
type GetValidatorRewardsInput = z.infer<typeof GetValidatorRewardsInputSchema>;
type GetValidatorBlocksInput = z.infer<typeof GetValidatorBlocksInputSchema>;

// ============================================================================
// Tool 1: casper_get_current_validators
// ============================================================================

export function registerGetCurrentValidatorsTool(
  server: McpServer,
  client: CsprCloudClient
): void {
  server.registerTool(
    "casper_get_current_validators",
    {
      title: "Get Current Era Validators",
      description: `Get all active validators for the current era on Casper Network.

Returns validator list with staking amounts, delegation info, and performance data.

**Use Cases:**
- View all active validators
- Compare validator stakes
- Find validators accepting delegations
- Analyze validator distribution

**Example:**
\`\`\`json
{
  "page": 1,
  "page_size": 50
}
\`\`\`

**Returns:**
- Validator public keys
- Total stakes and delegations
- Delegation rates
- Validator fees
- Active status
- Pagination info`,
      inputSchema: GetCurrentValidatorsInputSchema
    },
    async (params: GetCurrentValidatorsInput): Promise<CallToolResult> => {
      try {
        const result = await client.getCurrentValidators(params);

        // Get current era for context
        const metrics = await client.getAuctionMetrics();

        // Format validators list
        const validatorsList = result.data
          .map((validator, index) => {
            const totalStake = Number(validator.total_stake || 0) / 1e9;
            const delegatorsStake = Number(validator.delegators_stake || 0) / 1e9;
            const selfStake = totalStake - delegatorsStake;
            const fee = validator.fee || 0;

            return `${index + 1}. **${validator.public_key}**
   Total Stake: ${totalStake.toFixed(2)} CSPR
   Self Stake: ${selfStake.toFixed(2)} CSPR
   Delegators Stake: ${delegatorsStake.toFixed(2)} CSPR
   Fee: ${fee}%
   Delegators Count: ${validator.delegators_number || 0}
   ${validator.is_active ? "✅ ACTIVE" : "❌ INACTIVE"}`;
          })
          .join("\n\n");

        const totalNetworkStake = result.data.reduce(
          (sum, v) => sum + Number(v.total_stake || 0),
          0
        ) / 1e9;

        const textContent = `# Current Era Validators

**Era:** ${metrics.current_era_id}
**Total Validators:** ${result.item_count}
**Page:** ${params.page || 1} of ${result.page_count}
**Results:** ${result.data.length} validators
**Network Total Stake:** ${totalNetworkStake.toFixed(2)} CSPR

---

${validatorsList}

---

**Tip:** Use \`casper_get_validator_rewards\` with a validator public key to see their reward history.`;

        return {
          content: [
            {
              type: "text",
              text: textContent
            }
          ],
          structuredContent: {
            current_era: metrics.current_era_id,
            total_count: result.item_count,
            page_count: result.page_count,
            current_page: params.page || 1,
            network_total_stake_cspr: totalNetworkStake,
            validators: result.data.map((v) => ({
              public_key: v.public_key,
              total_stake_cspr: Number(v.total_stake || 0) / 1e9,
              self_stake_cspr: (Number(v.total_stake || 0) - Number(v.delegators_stake || 0)) / 1e9,
              delegators_stake_cspr: Number(v.delegators_stake || 0) / 1e9,
              fee: v.fee,
              delegators_number: v.delegators_number,
              is_active: v.is_active
            }))
          }
        };
      } catch (error) {
        return createErrorResult(error, "current validators query");
      }
    }
  );
}

// ============================================================================
// Tool 2: casper_get_validator_rewards
// ============================================================================

export function registerGetValidatorRewardsTool(
  server: McpServer,
  client: CsprCloudClient
): void {
  server.registerTool(
    "casper_get_validator_rewards",
    {
      title: "Get Validator Reward History",
      description: `Get reward history for a specific validator.

Returns era-by-era reward data showing validator earnings and delegator rewards.

**Use Cases:**
- Track validator performance
- Calculate validator earnings
- Verify reward distribution
- Analyze validator profitability

**Example:**
\`\`\`json
{
  "validator_public_key": "01abc123...",
  "page": 1,
  "page_size": 20
}
\`\`\`

**Returns:**
- Rewards per era
- Total amounts distributed
- Delegator vs validator rewards
- Era IDs and timestamps
- Pagination info`,
      inputSchema: GetValidatorRewardsInputSchema
    },
    async (params: GetValidatorRewardsInput): Promise<CallToolResult> => {
      try {
        const { validator_public_key, ...queryParams } = params;
        const result = await client.getValidatorRewards(validator_public_key, queryParams);

        if (result.data.length === 0) {
          const textContent = `# Validator Reward History

**Validator:** ${validator_public_key}
**Total Rewards:** 0

---

No reward history found for this validator.`;

          return {
            content: [
              {
                type: "text",
                text: textContent
              }
            ],
            structuredContent: {
              validator: validator_public_key,
              total_count: 0,
              rewards: []
            }
          };
        }

        // Format rewards list
        const rewardsList = result.data
          .map((reward, index) => {
            const totalReward = Number(reward.amount || 0) / 1e9;

            return `${index + 1}. **Era ${reward.era_id}**
   Reward Amount: ${totalReward.toFixed(2)} CSPR
   Timestamp: ${new Date(reward.timestamp).toLocaleString()}`;
          })
          .join("\n\n");

        // Calculate totals
        const totalEarnings = result.data.reduce(
          (sum, r) => sum + Number(r.amount || 0),
          0
        ) / 1e9;

        const textContent = `# Validator Reward History

**Validator:** ${validator_public_key}
**Total Rewards:** ${result.item_count} eras
**Page:** ${params.page || 1} of ${result.page_count}
**Results:** ${result.data.length} rewards
**Total Earnings (Page):** ${totalEarnings.toFixed(2)} CSPR

---

${rewardsList}

---

**Tip:** Consistent rewards across eras indicate stable validator performance and participation.`;

        return {
          content: [
            {
              type: "text",
              text: textContent
            }
          ],
          structuredContent: {
            validator: validator_public_key,
            total_count: result.item_count,
            page_count: result.page_count,
            current_page: params.page || 1,
            total_earnings_cspr: totalEarnings,
            rewards: result.data.map((r) => ({
              era_id: r.era_id,
              reward_amount_cspr: Number(r.amount || 0) / 1e9,
              timestamp: r.timestamp
            }))
          }
        };
      } catch (error) {
        return createErrorResult(error, "validator rewards query");
      }
    }
  );
}

// ============================================================================
// Tool 3: casper_get_validator_blocks
// ============================================================================

export function registerGetValidatorBlocksTool(
  server: McpServer,
  client: CsprCloudClient
): void {
  server.registerTool(
    "casper_get_validator_blocks",
    {
      title: "Get Validator Block History",
      description: `Get blocks proposed by a specific validator.

Returns list of all blocks created by the validator for performance tracking.

**Use Cases:**
- Track validator block production
- Verify validator activity
- Analyze validator performance
- Monitor block proposal patterns

**Example:**
\`\`\`json
{
  "validator_public_key": "01abc123...",
  "page": 1,
  "page_size": 20
}
\`\`\`

**Returns:**
- Block hashes and heights
- Block timestamps
- Era IDs
- Deploy counts per block
- Pagination info`,
      inputSchema: GetValidatorBlocksInputSchema
    },
    async (params: GetValidatorBlocksInput): Promise<CallToolResult> => {
      try {
        const { validator_public_key, ...queryParams } = params;
        const result = await client.getValidatorBlocks(validator_public_key, queryParams);

        if (result.data.length === 0) {
          const textContent = `# Validator Block History

**Validator:** ${validator_public_key}
**Total Blocks:** 0

---

No blocks found for this validator.`;

          return {
            content: [
              {
                type: "text",
                text: textContent
              }
            ],
            structuredContent: {
              validator: validator_public_key,
              total_count: 0,
              blocks: []
            }
          };
        }

        // Format blocks list
        const blocksList = result.data
          .map((block, index) => {
            const deployCount = calculateBlockDeployCount(block);
            return `${index + 1}. **Block ${block.block_height}**
   Hash: \`${block.block_hash}\`
   Era: ${block.era_id}
   Deploys: ${deployCount}
   Time: ${new Date(block.timestamp).toLocaleString()}`;
          })
          .join("\n\n");

        const totalDeploys = result.data.reduce(
          (sum, b) => sum + calculateBlockDeployCount(b),
          0
        );

        const textContent = `# Validator Block History

**Validator:** ${validator_public_key}
**Total Blocks:** ${result.item_count}
**Page:** ${params.page || 1} of ${result.page_count}
**Results:** ${result.data.length} blocks
**Total Deploys (Page):** ${totalDeploys}

---

${blocksList}

---

**Tip:** Use \`casper_get_deploy\` with deploy hashes from a block to see transaction details.`;

        return {
          content: [
            {
              type: "text",
              text: textContent
            }
          ],
          structuredContent: {
            validator: validator_public_key,
            total_count: result.item_count,
            page_count: result.page_count,
            current_page: params.page || 1,
            total_deploys: totalDeploys,
            blocks: result.data.map((b) => ({
              block_hash: b.block_hash,
              block_height: b.block_height,
              era_id: b.era_id,
              deploy_count: calculateBlockDeployCount(b),
              timestamp: b.timestamp
            }))
          }
        };
      } catch (error) {
        return createErrorResult(error, "validator blocks query");
      }
    }
  );
}

// ============================================================================
// Tool 4: casper_get_auction_metrics
// ============================================================================

export function registerGetAuctionMetricsTool(
  server: McpServer,
  client: CsprCloudClient
): void {
  server.registerTool(
    "casper_get_auction_metrics",
    {
      title: "Get Network Auction Metrics",
      description: `Get current Casper Network auction and era metrics.

Returns current era ID, auction state, and network-wide staking statistics.

**Use Cases:**
- Check current era
- View network staking totals
- Monitor auction state
- Track era transitions

**Example:**
\`\`\`json
{}
\`\`\`

**Returns:**
- Current era ID
- Total staked amount
- Total delegators
- Auction state hash
- Era end timestamp estimate`,
      inputSchema: z.object({}).strict()
    },
    async (): Promise<CallToolResult> => {
      try {
        const metrics = await client.getAuctionMetrics();

        const totalStake = Number(metrics.total_active_era_stake || 0) / 1e9;

        const textContent = `# Network Auction Metrics

**Current Era:** ${metrics.current_era_id}

## Staking Statistics

**Total Active Era Stake:** ${totalStake.toFixed(2)} CSPR
**Active Validators:** ${metrics.active_validator_number || 0}
**Total Bids:** ${metrics.total_bids_number || 0}
**Active Bids:** ${metrics.active_bids_number || 0}

---

**Tip:** Use \`casper_get_current_validators\` to see the full validator list for era ${metrics.current_era_id}.`;

        return {
          content: [
            {
              type: "text",
              text: textContent
            }
          ],
          structuredContent: {
            current_era_id: metrics.current_era_id,
            total_active_era_stake_cspr: totalStake,
            active_validator_number: metrics.active_validator_number,
            total_bids_number: metrics.total_bids_number,
            active_bids_number: metrics.active_bids_number
          }
        };
      } catch (error) {
        return createErrorResult(error, "auction metrics query");
      }
    }
  );
}

// ============================================================================
// Export all registration functions
// ============================================================================

export function registerAllValidatorTools(
  server: McpServer,
  client: CsprCloudClient
): void {
  registerGetCurrentValidatorsTool(server, client);
  registerGetValidatorRewardsTool(server, client);
  registerGetValidatorBlocksTool(server, client);
  registerGetAuctionMetricsTool(server, client);
}
