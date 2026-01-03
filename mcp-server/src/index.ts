#!/usr/bin/env node
/**
 * CSPR.AI MCP Server for Casper Network
 *
 * Entry point for the MCP server. This file handles:
 * - Server initialization
 * - Client setup
 * - Tool registration
 * - Transport connection (stdio or HTTP)
 *
 * Environment Variables:
 * - MCP_TRANSPORT: 'stdio' (default) or 'http'
 * - MCP_HTTP_PORT: Port for HTTP transport (default: 3001)
 * - CORS_ORIGIN: Allowed origin for CORS (default: http://localhost:3000)
 * - CASPER_RPC_URL: Casper RPC endpoint
 * - CASPER_NETWORK: 'testnet' or 'mainnet'
 * - CSPR_CLOUD_API_KEY: API key for cspr.cloud (optional)
 */

import { config } from "dotenv";
config(); // Load .env file

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { TESTNET_RPC_URL } from "./constants.js";
import { CasperClient } from "./services/casper-client.js";
import { CsprCloudClient } from "./services/cspr-cloud-client.js";
import { registerAllTools } from "./tools/index.js";
import { registerAllResources } from "./resources/index.js";
import { registerAllPrompts } from "./prompts/index.js";
import { createHttpTransport } from "./transport/http.js";

// ============ Configuration ============

const SERVER_NAME = "casper-mcp-server";
const SERVER_VERSION = "1.0.0";

// Transport mode from environment
const transportMode = process.env.MCP_TRANSPORT || 'stdio';
const httpPort = parseInt(process.env.MCP_HTTP_PORT || '3001', 10);
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000';

// ============ Initialize ============

// Get RPC URL from environment or use testnet default
const rpcUrl = process.env.CASPER_RPC_URL || TESTNET_RPC_URL;

// Determine network from RPC URL or environment variable
const network = process.env.CASPER_NETWORK ||
  (rpcUrl.includes("testnet") ? "testnet" : "mainnet");

// Get API keys from environment (optional)
const csprCloudApiKey = process.env.CSPR_CLOUD_API_KEY;
const rpcApiKey = process.env.CASPER_RPC_API_KEY || csprCloudApiKey;

// Create Casper RPC client
const casperClient = new CasperClient(rpcUrl, rpcApiKey);

// Create cspr.cloud REST API client
const csprCloudClient = new CsprCloudClient(network as "testnet" | "mainnet", csprCloudApiKey);

/**
 * Register all tools, resources, and prompts on an MCP server instance
 */
function configureServer(server: McpServer): void {
  registerAllTools(server, casperClient, csprCloudClient);
  registerAllResources(server);
  registerAllPrompts(server);
}

// ============ Main Entry Point ============

async function main(): Promise<void> {
  if (transportMode === 'http') {
    // HTTP mode for web frontend
    const httpTransport = createHttpTransport({
      port: httpPort,
      corsOrigin,
      serverName: SERVER_NAME,
      serverVersion: SERVER_VERSION,
      network,
      onServerCreated: configureServer,
    });

    await httpTransport.start();

    console.error(`${SERVER_NAME} v${SERVER_VERSION} running on HTTP`);
    console.error(`MCP endpoint: http://localhost:${httpPort}/mcp`);
    console.error(`Health check: http://localhost:${httpPort}/health`);
    console.error(`Network: ${network}`);
    console.error(`CORS origin: ${corsOrigin}`);
  } else {
    // Stdio mode for Claude Desktop / MCP Studio
    const server = new McpServer({
      name: SERVER_NAME,
      version: SERVER_VERSION
    });

    configureServer(server);

    const transport = new StdioServerTransport();
    await server.connect(transport);

    // Log to stderr (stdout is reserved for MCP protocol)
    console.error(`${SERVER_NAME} v${SERVER_VERSION} running on stdio`);
    console.error(`Casper RPC: ${rpcUrl}`);
    console.error(`Network: ${casperClient.getNetwork()}`);
    console.error(`cspr.cloud API: ${csprCloudClient.getNetwork()}`);
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
