/**
 * MCP HTTP Client for CSPR.AI
 *
 * Connects to the MCP server's HTTP transport.
 *
 * DO NOT MODIFY - Claude manages this file
 */

import type { MCPTool, ToolResult } from './types';

const MCP_SERVER_URL = process.env.NEXT_PUBLIC_MCP_SERVER_URL || 'http://localhost:3001';

// ============================================================================
// MCP Client Class
// ============================================================================

export class MCPClient {
  private sessionId: string | null = null;
  private serverInfo: { name: string; version: string } | null = null;

  /**
   * Initialize a new MCP session
   */
  async initialize(): Promise<{ sessionId: string; serverInfo: { name: string; version: string } }> {
    const response = await fetch(`${MCP_SERVER_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: { name: 'cspr-ai-web', version: '1.0.0' },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`MCP initialization failed: ${response.status}`);
    }

    const sessionId = response.headers.get('mcp-session-id');
    if (!sessionId) {
      throw new Error('No session ID returned from MCP server');
    }

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }

    this.sessionId = sessionId;
    this.serverInfo = data.result.serverInfo;

    if (!this.serverInfo) {
      throw new Error('No server info returned from MCP server');
    }

    return { sessionId, serverInfo: this.serverInfo };
  }

  /**
   * List available tools
   */
  async listTools(): Promise<MCPTool[]> {
    if (!this.sessionId) {
      throw new Error('Not initialized. Call initialize() first.');
    }

    const response = await fetch(`${MCP_SERVER_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'mcp-session-id': this.sessionId,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'tools/list',
        params: {},
      }),
    });

    const data = await response.json();
    if (data.error) {
      throw new Error(data.error.message);
    }

    return data.result.tools;
  }

  /**
   * Call a tool
   */
  async callTool(name: string, args: Record<string, unknown>): Promise<ToolResult> {
    if (!this.sessionId) {
      throw new Error('Not initialized. Call initialize() first.');
    }

    const toolCallId = `call_${Date.now()}`;

    const response = await fetch(`${MCP_SERVER_URL}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/event-stream',
        'mcp-session-id': this.sessionId,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: {
          name,
          arguments: args,
        },
      }),
    });

    const data = await response.json();

    return {
      toolCallId,
      toolName: name,
      result: data.result?.content?.[0]?.text ?? data.result,
      isError: data.result?.isError ?? false,
    };
  }

  /**
   * Close the session
   */
  async close(): Promise<void> {
    if (!this.sessionId) return;

    await fetch(`${MCP_SERVER_URL}/mcp`, {
      method: 'DELETE',
      headers: {
        'mcp-session-id': this.sessionId,
      },
    });

    this.sessionId = null;
    this.serverInfo = null;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.sessionId !== null;
  }
}

// ============================================================================
// Singleton instance
// ============================================================================

let clientInstance: MCPClient | null = null;

export function getMCPClient(): MCPClient {
  if (!clientInstance) {
    clientInstance = new MCPClient();
  }
  return clientInstance;
}
