/**
 * Test the casper_query_token MCP tool after refactoring
 *
 * This tests the actual MCP tool implementation that users will call.
 * It should now work correctly with the SDK-based casper-client.ts
 *
 * Run with: npx tsx test/test-query-token-tool.ts
 */

import dotenv from "dotenv";
import { casper_query_token } from "../src/tools/contract/token/query.js";

// Load environment variables
dotenv.config();

async function main() {
  console.log("=== Testing casper_query_token MCP Tool ===\n");

  // Token contract deployed on testnet
  const TOKEN_CONTRACT = "hash-810963e7e989ccc987683a2d1bcb4e17762f6511f06c306393dfd84c4db10995";

  try {
    // Test 1: Query metadata
    console.log("Test 1: Query token metadata...");
    const metadataResult = await casper_query_token({
      contract_address: TOKEN_CONTRACT,
      query_type: "metadata",
      response_format: "markdown"
    });
    console.log("✓ Metadata query successful!");
    console.log(metadataResult);
    console.log();

    // Test 2: Query total supply
    console.log("Test 2: Query total supply...");
    const supplyResult = await casper_query_token({
      contract_address: TOKEN_CONTRACT,
      query_type: "supply",
      response_format: "markdown"
    });
    console.log("✓ Supply query successful!");
    console.log(supplyResult);
    console.log();

    console.log("=== All Tests Passed - SUCCESS ===");
  } catch (error) {
    console.error("\n!!! ERROR !!!");
    console.error(error);
    if (error instanceof Error) {
      console.error("Message:", error.message);
      console.error("Stack:", error.stack);
    }
    process.exit(1);
  }
}

main();
