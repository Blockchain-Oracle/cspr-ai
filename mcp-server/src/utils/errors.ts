/**
 * Error handling utilities for the Casper MCP Server
 *
 * Provides actionable error messages with specific guidance
 * for common error scenarios.
 */

import type { CallToolResult } from "../types.js";

/**
 * Handle errors and return actionable error messages
 *
 * @param error - The caught error
 * @param context - Description of what was being attempted
 * @returns Formatted error message with guidance
 */
export function handleError(error: unknown, context: string): string {
  if (error instanceof Error) {
    // Invalid public key format
    if (error.message.includes("Invalid public key") || error.message.includes("invalid hex")) {
      return `Error: Invalid public key format.

Casper public keys must:
- Start with 01 (Ed25519) or 02 (Secp256k1)
- Be followed by 64 hexadecimal characters
- Total length: 66 characters

Example: 01a2b3c4d5e6f7... (66 chars total)

Context: ${context}`;
    }

    // Resource not found
    if (error.message.includes("not found") || error.message.includes("404")) {
      return `Error: Resource not found.

The requested ${context} could not be found on the network.
Please verify the identifier is correct.

Troubleshooting:
- Check for typos in the identifier
- Ensure you're connected to the correct network (testnet vs mainnet)
- The resource may not exist yet or has been removed`;
    }

    // Timeout errors
    if (error.message.includes("timeout") || error.message.includes("ETIMEDOUT") || error.message.includes("ECONNABORTED")) {
      return `Error: Request timed out.

The Casper node may be under heavy load or unreachable.

Troubleshooting:
- Wait a few seconds and try again
- Check if the RPC endpoint is available
- Consider using a different RPC endpoint

Context: ${context}`;
    }

    // Connection errors
    if (error.message.includes("ECONNREFUSED") || error.message.includes("ENOTFOUND")) {
      return `Error: Could not connect to Casper node.

Troubleshooting:
- Verify the RPC URL is correct
- Check your network connection
- The RPC endpoint may be temporarily unavailable

Context: ${context}`;
    }

    // Rate limiting
    if (error.message.includes("429") || error.message.includes("rate limit")) {
      return `Error: Rate limit exceeded.

You've made too many requests in a short period.

Troubleshooting:
- Wait a minute before making more requests
- Consider implementing request throttling
- Use a different RPC endpoint if available

Context: ${context}`;
    }

    // Generic error with message
    return `Error: ${error.message}

Context: ${context}

If this error persists, please check:
- Input parameters are valid
- Network connectivity
- RPC endpoint availability`;
  }

  // Unknown error type
  return `Error: An unexpected error occurred during ${context}.

Please try again. If the issue persists, check:
- Your input parameters
- Network connectivity
- The Casper network status`;
}

/**
 * Create an error result for tool responses
 *
 * @param error - The caught error
 * @param context - Description of what was being attempted
 * @returns CallToolResult with isError: true
 */
export function createErrorResult(error: unknown, context: string): CallToolResult {
  // Log error to stderr for debugging (stdout is reserved for MCP protocol)
  console.error(`[MCP Tool Error] ${context}:`, error);

  // Log stack trace if available for debugging
  if (error instanceof Error && error.stack) {
    console.error("Stack trace:", error.stack);
  }

  return {
    content: [{ type: "text", text: handleError(error, context) }],
    isError: true
  };
}
