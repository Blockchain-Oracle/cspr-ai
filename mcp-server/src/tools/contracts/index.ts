/**
 * Contract Tools - Export and Registration
 *
 * Centralized export for all smart contract interaction tools.
 */

import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { CasperClient } from "../../services/casper-client.js";
import { registerAllTokenTools } from "./token.js";
import { registerAllNftTools } from "./nft.js";
import { registerAllDaoTools } from "./dao.js";
import { registerAllDexTools } from "./dex.js";

/**
 * Register all contract tools with the MCP server
 */
export function registerAllContractTools(server: McpServer, client: CasperClient): void {
  // Token contract tools (CEP-18)
  registerAllTokenTools(server, client);

  // NFT contract tools
  registerAllNftTools(server, client);

  // DAO contract tools
  registerAllDaoTools(server, client);

  // DEX contract tools
  registerAllDexTools(server, client);
}
