/**
 * Tool Registry
 *
 * Exports a function to register all Casper MCP tools with the server.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CasperClient } from "../services/casper-client.js";
import type { CsprCloudClient } from "../services/cspr-cloud-client.js";

import { registerBalanceTool } from "./balance.js";
import { registerValidatorsTool } from "./validators.js";
import { registerStakingTool } from "./staking.js";
import { registerDeployTool } from "./deploy.js";
import { registerTransferTool } from "./transfer.js";
import { registerDelegationTool } from "./delegation.js";
import { registerSigningTools } from "./signing.js";
import { registerAllContractTools } from "./contracts/index.js";

// cspr.cloud REST API tools
import { registerAllDeployTrackingTools } from "./cspr-cloud/deploy-tracking.js";
// NOTE: Token and NFT cspr.cloud REST API tools removed - endpoints not available on testnet
// Token/NFT history via REST API is mainnet-only. For testnet, use custom contract tools instead.
import { registerAllValidatorTools } from "./cspr-cloud/validators.js";
import { registerAllTransferTools } from "./cspr-cloud/transfers.js";

/**
 * Register all Casper MCP tools with the server
 *
 * @param server - The MCP server instance
 * @param client - The Casper RPC client
 * @param cloudClient - Optional cspr.cloud REST API client for enhanced queries
 */
export function registerAllTools(
  server: McpServer,
  client: CasperClient,
  cloudClient?: CsprCloudClient
): void {
  // ===== RPC-based tools (casper-js-sdk) =====

  // Read-only query tools
  registerBalanceTool(server, client);
  registerValidatorsTool(server, client);
  registerStakingTool(server, client);
  registerDeployTool(server, client);

  // Transaction building tools
  registerTransferTool(server, client);
  registerDelegationTool(server, client);

  // Transaction signing and submission tools (stdio mode)
  registerSigningTools(server, client);

  // Smart contract interaction tools
  registerAllContractTools(server, client);

  // ===== REST API tools (cspr.cloud) =====

  if (cloudClient) {
    // Deploy tracking and history
    registerAllDeployTrackingTools(server, cloudClient);

    // NOTE: Token (CEP-18) and NFT (CEP-47/CEP-78) REST API tools removed
    // These cspr.cloud endpoints are not available on testnet
    // For testnet, use the custom contract tools (casper_query_token, casper_query_nft, etc.)

    // Validator performance and staking
    registerAllValidatorTools(server, cloudClient);

    // Native CSPR transfer history
    registerAllTransferTools(server, cloudClient);
  }
}

// Re-export individual registration functions for selective use
export {
  registerBalanceTool,
  registerValidatorsTool,
  registerStakingTool,
  registerDeployTool,
  registerTransferTool,
  registerDelegationTool,
  registerSigningTools,
  registerAllDeployTrackingTools,
  // registerAllTokenHistoryTools, // Removed - testnet not supported
  // registerAllNFTTools, // Removed - testnet not supported
  registerAllValidatorTools,
  registerAllTransferTools
};
