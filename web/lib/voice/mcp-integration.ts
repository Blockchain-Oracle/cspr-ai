/**
 * MCP Integration for Voice Agent
 *
 * Converts MCP tools to OpenAI Realtime API function format
 * and handles tool execution with approval flow.
 */

import { McpClient, type McpTool } from './mcp-client';

// Re-export McpTool type for consumers
export type { McpTool };

// Global MCP client instance (reuses session)
let mcpClientInstance: McpClient | null = null;

/**
 * OpenAI Function Definition
 */
export interface OpenAIFunction {
  name: string;
  description: string;
  parameters: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Tool Call Approval Request
 */
export interface ToolCallApproval {
  toolName: string;
  arguments: Record<string, any>;
  description: string;
  isFinancialOperation: boolean;
}

/**
 * Get or create MCP client instance
 */
function getMcpClient(serverUrl: string): McpClient {
  if (!mcpClientInstance) {
    mcpClientInstance = new McpClient(serverUrl);
  }
  return mcpClientInstance;
}

/**
 * Fetch available MCP tools from the server
 */
export async function fetchMcpTools(serverUrl: string): Promise<McpTool[]> {
  try {
    const client = getMcpClient(serverUrl);
    const tools = await client.listTools();
    console.log('[MCP] Loaded', tools.length, 'tools');
    return tools;
  } catch (error) {
    console.error('[MCP] Failed to fetch tools:', error);
    throw error;
  }
}

/**
 * Convert MCP tool to OpenAI function format
 */
export function convertMcpToolToOpenAI(tool: McpTool): OpenAIFunction {
  return {
    name: tool.name,
    description: tool.description || `Execute ${tool.name}`,
    parameters: {
      type: 'object',
      properties: tool.inputSchema.properties || {},
      required: tool.inputSchema.required || [],
    },
  };
}

/**
 * Determine if a tool requires approval
 * Financial operations always require approval
 */
export function requiresApproval(toolName: string): boolean {
  // Tools that modify blockchain state (build transactions, sign, submit)
  const financialOperations = [
    'casper_build_transfer',
    'casper_build_delegation',
    'casper_build_token_transfer',
    'casper_build_token_mint',
    'casper_build_token_burn',
    'casper_build_nft_mint',
    'casper_build_nft_transfer',
    'casper_build_nft_burn',
    'casper_build_dao_propose',
    'casper_build_dao_vote',
    'casper_build_dao_execute',
    'casper_build_dex_create_pool',
    'casper_build_dex_add_liquidity',
    'casper_build_dex_remove_liquidity',
    'casper_build_dex_swap',
    'casper_sign_and_submit_transaction',
  ];

  return financialOperations.includes(toolName);
}

/**
 * Check if a tool is a financial operation
 */
export function isFinancialOperation(toolName: string): boolean {
  return toolName.includes('build_') ||
         toolName.includes('sign') ||
         toolName.includes('submit') ||
         toolName.includes('transfer') ||
         toolName.includes('delegation') ||
         toolName.includes('mint') ||
         toolName.includes('burn');
}

/**
 * Execute MCP tool call
 */
export async function executeMcpTool(
  serverUrl: string,
  toolName: string,
  toolArguments: Record<string, any>
): Promise<any> {
  try {
    console.log('[MCP] Executing tool:', toolName, 'with args:', toolArguments);

    const client = getMcpClient(serverUrl);
    const result = await client.callTool(toolName, toolArguments);

    console.log('[MCP] Tool result:', result);

    // Extract text content from MCP result format
    if (result.content && Array.isArray(result.content)) {
      const textContent = result.content
        .filter(c => c.type === 'text')
        .map(c => c.text)
        .join('\n');

      // Try to parse as JSON if possible
      try {
        return JSON.parse(textContent);
      } catch {
        return { text: textContent };
      }
    }

    return result;
  } catch (error) {
    console.error('[MCP] Tool execution error:', error);
    throw error;
  }
}

/**
 * Format tool result for voice response
 * Converts technical data into natural speech
 */
export function formatToolResultForVoice(toolName: string, result: any): string {
  // Balance query
  if (toolName === 'casper_get_balance') {
    const balance = result.balance_cspr || '0';
    return `Your balance is ${balance} CSPR.`;
  }

  // Validator listing
  if (toolName === 'casper_get_validators') {
    const count = result.validators?.length || 0;
    return `Found ${count} validators. The details are shown on screen.`;
  }

  // Transaction build
  if (toolName.includes('build_')) {
    return `Transaction prepared. Please review the details on screen and confirm.`;
  }

  // Deploy status
  if (toolName === 'casper_get_deploy_status' || toolName === 'casper_check_deploy_status') {
    const status = result.status || 'unknown';
    return `Transaction status: ${status}.`;
  }

  // Staking info
  if (toolName === 'casper_get_staking_info') {
    const totalStaked = result.total_staked_cspr || '0';
    return `You have ${totalStaked} CSPR staked.`;
  }

  // Token query
  if (toolName === 'casper_query_token') {
    if (result.balance) {
      return `Token balance: ${result.balance}.`;
    }
    if (result.name && result.symbol) {
      return `Token ${result.name}, symbol ${result.symbol}.`;
    }
  }

  // NFT query
  if (toolName === 'casper_query_nft') {
    if (result.owner) {
      return `NFT owner: ${result.owner.substring(0, 10)}... Details on screen.`;
    }
    if (result.collection_name) {
      return `Collection: ${result.collection_name}. Details on screen.`;
    }
  }

  // Generic response
  return `Operation completed. Check the screen for details.`;
}

/**
 * Get user-friendly description for tool approval modal
 */
export function getToolDescription(toolName: string, args: Record<string, any>): string {
  // Transfer
  if (toolName === 'casper_build_transfer') {
    return `Send ${args.amount_cspr || '?'} CSPR to ${args.to_public_key?.substring(0, 10) || '?'}...`;
  }

  // Delegation
  if (toolName === 'casper_build_delegation') {
    return `Stake ${args.amount_cspr || '?'} CSPR with validator ${args.validator_public_key?.substring(0, 10) || '?'}...`;
  }

  // Token transfer
  if (toolName === 'casper_build_token_transfer') {
    return `Transfer ${args.amount || '?'} tokens to ${args.recipient?.substring(0, 10) || '?'}...`;
  }

  // Generic description
  return `Execute ${toolName.replace('casper_', '').replace(/_/g, ' ')}`;
}

/**
 * Close MCP client session
 * Call this when disconnecting voice session
 */
export async function closeMcpSession(): Promise<void> {
  if (mcpClientInstance) {
    try {
      await mcpClientInstance.close();
    } finally {
      mcpClientInstance = null;
    }
  }
}
