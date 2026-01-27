/**
 * MCP Client for Browser
 *
 * Implements the Model Context Protocol (MCP) client for HTTP transport.
 * Handles session management and JSON-RPC communication with MCP server.
 */

export interface McpTool {
  name: string;
  description?: string;
  inputSchema: {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
  };
}

export interface McpToolResult {
  content: Array<{
    type: string;
    text?: string;
    [key: string]: any;
  }>;
  isError?: boolean;
}

/**
 * Simple MCP client for browser with session management
 */
export class McpClient {
  private serverUrl: string;
  private sessionId: string | null = null;
  private requestId = 1;

  constructor(serverUrl: string) {
    // Remove trailing /mcp if present (we'll add it back)
    this.serverUrl = serverUrl.replace(/\/mcp$/, '');
  }

  /**
   * Initialize MCP session
   */
  async initialize(): Promise<void> {
    const response = await fetch(`${this.serverUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: this.requestId++,
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {},
          clientInfo: {
            name: 'cspr-ai-voice',
            version: '1.0.0',
          },
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to initialize MCP session: ${response.statusText}`);
    }

    // Get session ID from response header
    const sessionId = response.headers.get('mcp-session-id');
    if (!sessionId) {
      throw new Error('MCP server did not return session ID');
    }

    this.sessionId = sessionId;
    console.log('[MCP Client] Session initialized:', sessionId);
  }

  /**
   * Ensure session is initialized
   */
  private async ensureSession(): Promise<void> {
    if (!this.sessionId) {
      await this.initialize();
    }
  }

  /**
   * List available tools
   */
  async listTools(): Promise<McpTool[]> {
    await this.ensureSession();

    const response = await fetch(`${this.serverUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'mcp-session-id': this.sessionId!,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: this.requestId++,
        method: 'tools/list',
        params: {},
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to list tools: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`MCP error: ${data.error.message}`);
    }

    return data.result?.tools || [];
  }

  /**
   * Call a tool
   */
  async callTool(name: string, args: Record<string, any>): Promise<McpToolResult> {
    await this.ensureSession();

    const response = await fetch(`${this.serverUrl}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'mcp-session-id': this.sessionId!,
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: this.requestId++,
        method: 'tools/call',
        params: {
          name,
          arguments: args,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to call tool: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(`Tool execution error: ${data.error.message}`);
    }

    return data.result;
  }

  /**
   * Close the session
   */
  async close(): Promise<void> {
    if (!this.sessionId) {
      return;
    }

    try {
      await fetch(`${this.serverUrl}/mcp`, {
        method: 'DELETE',
        headers: {
          'mcp-session-id': this.sessionId,
        },
      });
      console.log('[MCP Client] Session closed:', this.sessionId);
    } catch (error) {
      console.error('[MCP Client] Failed to close session:', error);
    } finally {
      this.sessionId = null;
    }
  }
}
